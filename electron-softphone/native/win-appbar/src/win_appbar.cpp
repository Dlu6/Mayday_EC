// win_appbar.cpp - Native Windows AppBar implementation for Electron
// Uses Windows Shell AppBar API (SHAppBarMessage) to register as a system appbar
// This allows the window to reserve screen space like the Windows taskbar

#include <napi.h>
#include <windows.h>
#include <shellapi.h>
#include <map>
#include <mutex>

// AppBar state management
struct AppBarState {
    HWND hwnd;
    UINT callbackMsg;
    bool isRegistered;
    RECT originalRect;
    int edge;
    int height;
};

static std::map<HWND, AppBarState> g_appbars;
static std::mutex g_mutex;
static UINT g_nextCallbackMsg = WM_USER + 0x100;

// Edge constants matching Windows API
const int EDGE_TOP = ABE_TOP;
const int EDGE_BOTTOM = ABE_BOTTOM;
const int EDGE_LEFT = ABE_LEFT;
const int EDGE_RIGHT = ABE_RIGHT;

// Get the work area for a specific monitor
RECT GetMonitorWorkArea(HWND hwnd) {
    HMONITOR hMonitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
    MONITORINFO mi;
    mi.cbSize = sizeof(MONITORINFO);
    GetMonitorInfo(hMonitor, &mi);
    return mi.rcMonitor;
}

// Get DPI scaling factor for the window
double GetDpiScaleFactor(HWND hwnd) {
    HDC hdc = GetDC(hwnd);
    int dpi = GetDeviceCaps(hdc, LOGPIXELSY);
    ReleaseDC(hwnd, hdc);
    return dpi / 96.0;
}

// Register window as an AppBar with Windows Shell
Napi::Value RegisterAppBar(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 2) {
        Napi::TypeError::New(env, "Expected hwnd buffer and height").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    // Get HWND from buffer (Electron passes native window handle as Buffer)
    Napi::Buffer<void*> hwndBuffer = info[0].As<Napi::Buffer<void*>>();
    HWND hwnd = static_cast<HWND>(*reinterpret_cast<void**>(hwndBuffer.Data()));
    
    int height = info[1].As<Napi::Number>().Int32Value();
    int edge = EDGE_TOP; // Default to top edge
    
    if (info.Length() > 2 && info[2].IsNumber()) {
        edge = info[2].As<Napi::Number>().Int32Value();
    }
    
    if (!IsWindow(hwnd)) {
        Napi::Error::New(env, "Invalid window handle").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::lock_guard<std::mutex> lock(g_mutex);
    
    // Check if already registered
    if (g_appbars.find(hwnd) != g_appbars.end() && g_appbars[hwnd].isRegistered) {
        return Napi::Boolean::New(env, true);
    }
    
    // Save original window rect
    RECT originalRect;
    GetWindowRect(hwnd, &originalRect);
    
    // Create callback message
    UINT callbackMsg = g_nextCallbackMsg++;
    
    // Register the appbar
    APPBARDATA abd;
    ZeroMemory(&abd, sizeof(APPBARDATA));
    abd.cbSize = sizeof(APPBARDATA);
    abd.hWnd = hwnd;
    abd.uCallbackMessage = callbackMsg;
    
    if (!SHAppBarMessage(ABM_NEW, &abd)) {
        Napi::Error::New(env, "Failed to register AppBar with Windows Shell").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    // Get monitor info for positioning
    RECT monitorRect = GetMonitorWorkArea(hwnd);
    double dpiScale = GetDpiScaleFactor(hwnd);
    int scaledHeight = static_cast<int>(height * dpiScale);
    
    // Set the appbar position
    abd.uEdge = edge;
    abd.rc = monitorRect;
    
    switch (edge) {
        case ABE_TOP:
            abd.rc.bottom = abd.rc.top + scaledHeight;
            break;
        case ABE_BOTTOM:
            abd.rc.top = abd.rc.bottom - scaledHeight;
            break;
        case ABE_LEFT:
            abd.rc.right = abd.rc.left + scaledHeight;
            break;
        case ABE_RIGHT:
            abd.rc.left = abd.rc.right - scaledHeight;
            break;
    }
    
    // Query for the position (Windows may adjust it)
    SHAppBarMessage(ABM_QUERYPOS, &abd);
    
    // Adjust rect based on edge after query
    switch (edge) {
        case ABE_TOP:
            abd.rc.bottom = abd.rc.top + scaledHeight;
            break;
        case ABE_BOTTOM:
            abd.rc.top = abd.rc.bottom - scaledHeight;
            break;
        case ABE_LEFT:
            abd.rc.right = abd.rc.left + scaledHeight;
            break;
        case ABE_RIGHT:
            abd.rc.left = abd.rc.right - scaledHeight;
            break;
    }
    
    // Set the final position
    SHAppBarMessage(ABM_SETPOS, &abd);
    
    // Move window to the appbar position
    MoveWindow(hwnd, abd.rc.left, abd.rc.top, 
               abd.rc.right - abd.rc.left, 
               abd.rc.bottom - abd.rc.top, TRUE);
    
    // Store state
    AppBarState state;
    state.hwnd = hwnd;
    state.callbackMsg = callbackMsg;
    state.isRegistered = true;
    state.originalRect = originalRect;
    state.edge = edge;
    state.height = height;
    g_appbars[hwnd] = state;
    
    // Return the actual rect used
    Napi::Object result = Napi::Object::New(env);
    result.Set("success", Napi::Boolean::New(env, true));
    result.Set("left", Napi::Number::New(env, abd.rc.left));
    result.Set("top", Napi::Number::New(env, abd.rc.top));
    result.Set("right", Napi::Number::New(env, abd.rc.right));
    result.Set("bottom", Napi::Number::New(env, abd.rc.bottom));
    result.Set("width", Napi::Number::New(env, abd.rc.right - abd.rc.left));
    result.Set("height", Napi::Number::New(env, abd.rc.bottom - abd.rc.top));
    result.Set("dpiScale", Napi::Number::New(env, dpiScale));
    
    return result;
}

// Unregister the AppBar and restore the window
Napi::Value UnregisterAppBar(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1) {
        Napi::TypeError::New(env, "Expected hwnd buffer").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::Buffer<void*> hwndBuffer = info[0].As<Napi::Buffer<void*>>();
    HWND hwnd = static_cast<HWND>(*reinterpret_cast<void**>(hwndBuffer.Data()));
    
    std::lock_guard<std::mutex> lock(g_mutex);
    
    auto it = g_appbars.find(hwnd);
    if (it == g_appbars.end() || !it->second.isRegistered) {
        return Napi::Boolean::New(env, false);
    }
    
    // Unregister from Windows Shell
    APPBARDATA abd;
    ZeroMemory(&abd, sizeof(APPBARDATA));
    abd.cbSize = sizeof(APPBARDATA);
    abd.hWnd = hwnd;
    
    SHAppBarMessage(ABM_REMOVE, &abd);
    
    // Restore original window position
    RECT& orig = it->second.originalRect;
    MoveWindow(hwnd, orig.left, orig.top,
               orig.right - orig.left,
               orig.bottom - orig.top, TRUE);
    
    // Remove from tracking
    g_appbars.erase(it);
    
    return Napi::Boolean::New(env, true);
}

// Update the AppBar position (call when monitor changes, DPI changes, etc.)
Napi::Value UpdateAppBarPosition(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1) {
        Napi::TypeError::New(env, "Expected hwnd buffer").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::Buffer<void*> hwndBuffer = info[0].As<Napi::Buffer<void*>>();
    HWND hwnd = static_cast<HWND>(*reinterpret_cast<void**>(hwndBuffer.Data()));
    
    std::lock_guard<std::mutex> lock(g_mutex);
    
    auto it = g_appbars.find(hwnd);
    if (it == g_appbars.end() || !it->second.isRegistered) {
        return Napi::Boolean::New(env, false);
    }
    
    AppBarState& state = it->second;
    
    // Get current monitor info
    RECT monitorRect = GetMonitorWorkArea(hwnd);
    double dpiScale = GetDpiScaleFactor(hwnd);
    int scaledHeight = static_cast<int>(state.height * dpiScale);
    
    APPBARDATA abd;
    ZeroMemory(&abd, sizeof(APPBARDATA));
    abd.cbSize = sizeof(APPBARDATA);
    abd.hWnd = hwnd;
    abd.uEdge = state.edge;
    abd.rc = monitorRect;
    
    switch (state.edge) {
        case ABE_TOP:
            abd.rc.bottom = abd.rc.top + scaledHeight;
            break;
        case ABE_BOTTOM:
            abd.rc.top = abd.rc.bottom - scaledHeight;
            break;
        case ABE_LEFT:
            abd.rc.right = abd.rc.left + scaledHeight;
            break;
        case ABE_RIGHT:
            abd.rc.left = abd.rc.right - scaledHeight;
            break;
    }
    
    SHAppBarMessage(ABM_QUERYPOS, &abd);
    
    switch (state.edge) {
        case ABE_TOP:
            abd.rc.bottom = abd.rc.top + scaledHeight;
            break;
        case ABE_BOTTOM:
            abd.rc.top = abd.rc.bottom - scaledHeight;
            break;
        case ABE_LEFT:
            abd.rc.right = abd.rc.left + scaledHeight;
            break;
        case ABE_RIGHT:
            abd.rc.left = abd.rc.right - scaledHeight;
            break;
    }
    
    SHAppBarMessage(ABM_SETPOS, &abd);
    
    MoveWindow(hwnd, abd.rc.left, abd.rc.top,
               abd.rc.right - abd.rc.left,
               abd.rc.bottom - abd.rc.top, TRUE);
    
    Napi::Object result = Napi::Object::New(env);
    result.Set("success", Napi::Boolean::New(env, true));
    result.Set("left", Napi::Number::New(env, abd.rc.left));
    result.Set("top", Napi::Number::New(env, abd.rc.top));
    result.Set("width", Napi::Number::New(env, abd.rc.right - abd.rc.left));
    result.Set("height", Napi::Number::New(env, abd.rc.bottom - abd.rc.top));
    
    return result;
}

// Check if window is registered as AppBar
Napi::Value IsAppBarRegistered(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1) {
        return Napi::Boolean::New(env, false);
    }
    
    Napi::Buffer<void*> hwndBuffer = info[0].As<Napi::Buffer<void*>>();
    HWND hwnd = static_cast<HWND>(*reinterpret_cast<void**>(hwndBuffer.Data()));
    
    std::lock_guard<std::mutex> lock(g_mutex);
    
    auto it = g_appbars.find(hwnd);
    return Napi::Boolean::New(env, it != g_appbars.end() && it->second.isRegistered);
}

// Get information about all monitors
Napi::Value GetMonitorInfoNapi(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1) {
        Napi::TypeError::New(env, "Expected hwnd buffer").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::Buffer<void*> hwndBuffer = info[0].As<Napi::Buffer<void*>>();
    HWND hwnd = static_cast<HWND>(*reinterpret_cast<void**>(hwndBuffer.Data()));
    
    HMONITOR hMonitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
    MONITORINFO mi;
    mi.cbSize = sizeof(MONITORINFO);
    GetMonitorInfo(hMonitor, &mi);
    
    double dpiScale = GetDpiScaleFactor(hwnd);
    
    Napi::Object result = Napi::Object::New(env);
    
    Napi::Object monitor = Napi::Object::New(env);
    monitor.Set("left", Napi::Number::New(env, mi.rcMonitor.left));
    monitor.Set("top", Napi::Number::New(env, mi.rcMonitor.top));
    monitor.Set("right", Napi::Number::New(env, mi.rcMonitor.right));
    monitor.Set("bottom", Napi::Number::New(env, mi.rcMonitor.bottom));
    monitor.Set("width", Napi::Number::New(env, mi.rcMonitor.right - mi.rcMonitor.left));
    monitor.Set("height", Napi::Number::New(env, mi.rcMonitor.bottom - mi.rcMonitor.top));
    result.Set("monitor", monitor);
    
    Napi::Object work = Napi::Object::New(env);
    work.Set("left", Napi::Number::New(env, mi.rcWork.left));
    work.Set("top", Napi::Number::New(env, mi.rcWork.top));
    work.Set("right", Napi::Number::New(env, mi.rcWork.right));
    work.Set("bottom", Napi::Number::New(env, mi.rcWork.bottom));
    work.Set("width", Napi::Number::New(env, mi.rcWork.right - mi.rcWork.left));
    work.Set("height", Napi::Number::New(env, mi.rcWork.bottom - mi.rcWork.top));
    result.Set("workArea", work);
    
    result.Set("dpiScale", Napi::Number::New(env, dpiScale));
    result.Set("isPrimary", Napi::Boolean::New(env, (mi.dwFlags & MONITORINFOF_PRIMARY) != 0));
    
    return result;
}

// Set window to always on top (complement to AppBar functionality)
Napi::Value SetAlwaysOnTop(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 2) {
        Napi::TypeError::New(env, "Expected hwnd buffer and boolean").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::Buffer<void*> hwndBuffer = info[0].As<Napi::Buffer<void*>>();
    HWND hwnd = static_cast<HWND>(*reinterpret_cast<void**>(hwndBuffer.Data()));
    bool onTop = info[1].As<Napi::Boolean>().Value();
    
    HWND insertAfter = onTop ? HWND_TOPMOST : HWND_NOTOPMOST;
    BOOL result = SetWindowPos(hwnd, insertAfter, 0, 0, 0, 0, 
                               SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
    
    return Napi::Boolean::New(env, result != 0);
}

// Remove window frame for cleaner appbar look
Napi::Value SetFrameless(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 2) {
        Napi::TypeError::New(env, "Expected hwnd buffer and boolean").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Napi::Buffer<void*> hwndBuffer = info[0].As<Napi::Buffer<void*>>();
    HWND hwnd = static_cast<HWND>(*reinterpret_cast<void**>(hwndBuffer.Data()));
    bool frameless = info[1].As<Napi::Boolean>().Value();
    
    LONG style = GetWindowLong(hwnd, GWL_STYLE);
    
    if (frameless) {
        // Remove caption and border
        style &= ~(WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU);
        style |= WS_POPUP;
    } else {
        // Restore standard window style
        style |= WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU;
        style &= ~WS_POPUP;
    }
    
    SetWindowLong(hwnd, GWL_STYLE, style);
    
    // Force redraw
    SetWindowPos(hwnd, NULL, 0, 0, 0, 0, 
                 SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOOWNERZORDER);
    
    return Napi::Boolean::New(env, true);
}

// Cleanup all registered appbars (call on app exit)
Napi::Value CleanupAllAppBars(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    std::lock_guard<std::mutex> lock(g_mutex);
    
    for (auto& pair : g_appbars) {
        if (pair.second.isRegistered) {
            APPBARDATA abd;
            ZeroMemory(&abd, sizeof(APPBARDATA));
            abd.cbSize = sizeof(APPBARDATA);
            abd.hWnd = pair.first;
            SHAppBarMessage(ABM_REMOVE, &abd);
        }
    }
    
    g_appbars.clear();
    
    return Napi::Boolean::New(env, true);
}

// Module initialization
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("registerAppBar", Napi::Function::New(env, RegisterAppBar));
    exports.Set("unregisterAppBar", Napi::Function::New(env, UnregisterAppBar));
    exports.Set("updateAppBarPosition", Napi::Function::New(env, UpdateAppBarPosition));
    exports.Set("isAppBarRegistered", Napi::Function::New(env, IsAppBarRegistered));
    exports.Set("getMonitorInfo", Napi::Function::New(env, GetMonitorInfoNapi));
    exports.Set("setAlwaysOnTop", Napi::Function::New(env, SetAlwaysOnTop));
    exports.Set("setFrameless", Napi::Function::New(env, SetFrameless));
    exports.Set("cleanupAllAppBars", Napi::Function::New(env, CleanupAllAppBars));
    
    // Export edge constants
    exports.Set("EDGE_TOP", Napi::Number::New(env, EDGE_TOP));
    exports.Set("EDGE_BOTTOM", Napi::Number::New(env, EDGE_BOTTOM));
    exports.Set("EDGE_LEFT", Napi::Number::New(env, EDGE_LEFT));
    exports.Set("EDGE_RIGHT", Napi::Number::New(env, EDGE_RIGHT));
    
    return exports;
}

NODE_API_MODULE(win_appbar, Init)
