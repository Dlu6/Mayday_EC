// electron-softphone/src/services/networkService.js
// Unified network connectivity monitoring service
// Provides accurate network state detection and recovery events

import { EventEmitter } from "events";
import serverConfig from "../config/serverConfig";
import logoutManager from "./logoutManager";

class NetworkService extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50);

        // Network state
        this.isOnline = navigator.onLine;
        this.isServerReachable = false;
        this.lastPingTime = null;
        this.consecutiveFailures = 0;
        this.pingInterval = null;
        this.wasOffline = false;

        // Configuration
        this.config = {
            pingIntervalMs: 15000, // Check every 15 seconds
            pingTimeoutMs: 5000, // 5 second timeout for ping
            fastPingIntervalMs: 3000, // Fast ping when recovering
            maxConsecutiveFailures: 3, // Before declaring server unreachable
        };

        // Bind methods
        this.handleOnline = this.handleOnline.bind(this);
        this.handleOffline = this.handleOffline.bind(this);
        this.pingServer = this.pingServer.bind(this);

        // Initialize
        this.initialize();
    }

    initialize() {
        // Add browser online/offline listeners
        window.addEventListener("online", this.handleOnline);
        window.addEventListener("offline", this.handleOffline);

        // Start periodic server ping
        this.startPingInterval();

        console.log(
            `🌐 NetworkService initialized - Browser online: ${this.isOnline}`
        );
    }

    handleOnline() {
        const wasOffline = !this.isOnline;
        this.isOnline = true;
        this.wasOffline = wasOffline;

        console.log("🌐 Browser reports ONLINE");

        // Emit network online event
        this.emit("network:browser_online");

        if (wasOffline) {
            // Network just recovered - do fast ping to verify server reachability
            console.log("🌐 Network recovered from offline - verifying server...");
            this.startFastPingMode();
        }
    }

    handleOffline() {
        this.isOnline = false;
        this.isServerReachable = false;
        this.wasOffline = true;

        console.log("🌐 Browser reports OFFLINE");

        // Emit network offline event immediately
        this.emit("network:offline", { reason: "browser_offline" });
        this.emit("network:status", {
            isOnline: false,
            isServerReachable: false,
            reason: "browser_offline",
        });
    }

    startPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }

        this.pingInterval = setInterval(
            this.pingServer,
            this.config.pingIntervalMs
        );

        // Do an immediate ping
        this.pingServer();
    }

    startFastPingMode() {
        // Switch to fast ping interval for quick recovery detection
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }

        let fastPingCount = 0;
        const maxFastPings = 5;

        const fastPing = async () => {
            fastPingCount++;
            const reachable = await this.pingServer();

            if (reachable) {
                // Server is reachable - emit recovery event and switch back to normal ping
                console.log("✅ Server reachable after network recovery");
                this.emit("network:recovered");
                this.startPingInterval();
            } else if (fastPingCount >= maxFastPings) {
                // Max fast pings reached - switch back to normal interval
                console.log(
                    "⚠️ Server not reachable after fast ping attempts, continuing normal ping"
                );
                this.startPingInterval();
            } else {
                // Continue fast ping
                setTimeout(fastPing, this.config.fastPingIntervalMs);
            }
        };

        // Start fast ping
        fastPing();
    }

    async pingServer() {
        // Don't ping if browser is offline
        if (!navigator.onLine) {
            this.isServerReachable = false;
            return false;
        }

        // Don't ping during logout
        if (window.isLoggingOut || window.apiCallsBlocked) {
            return this.isServerReachable;
        }

        // Check if WebSocket is already connected - if so, server is reachable
        // This avoids unnecessary HTTP pings when we already have a live connection
        try {
            const websocketService = await import('./websocketService').then(m => m.default);
            if (websocketService && websocketService.isConnected) {
                const wasUnreachable = !this.isServerReachable;
                this.isServerReachable = true;
                this.lastPingTime = Date.now();
                this.consecutiveFailures = 0;

                if (wasUnreachable) {
                    console.log("✅ Server reachable (via WebSocket)");
                    this.emit("network:server_reachable");
                    this.emit("network:online");
                    this.emit("network:status", {
                        isOnline: true,
                        isServerReachable: true,
                    });
                }
                return true;
            }
        } catch (_) {
            // WebSocket service not available, fall back to HTTP ping
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(
                () => controller.abort(),
                this.config.pingTimeoutMs
            );

            // Use the dedicated health endpoint for ping
            const response = await fetch(`${serverConfig.apiUrl}/api/health`, {
                method: "GET",
                signal: controller.signal,
                cache: "no-store",
                headers: {
                    'Accept': 'application/json',
                },
            });

            clearTimeout(timeoutId);

            // Any non-network-error response means server is reachable
            // (even 401/403 means server responded)
            const wasUnreachable = !this.isServerReachable;
            this.isServerReachable = true; // Server responded, so it's reachable
            this.lastPingTime = Date.now();
            this.consecutiveFailures = 0;

            // If we just became reachable after being unreachable
            if (wasUnreachable) {
                console.log("✅ Server became reachable");
                this.emit("network:server_reachable");
                this.emit("network:online");
                this.emit("network:status", {
                    isOnline: true,
                    isServerReachable: true,
                });
            }

            return true;
        } catch (error) {
            // Only count as failure if it's a network error (not HTTP error)
            // AbortError means timeout, which is a connectivity issue
            if (error.name === 'AbortError' || error.message?.includes('fetch')) {
                this.consecutiveFailures++;

                // Only mark as unreachable after consecutive failures
                if (this.consecutiveFailures >= this.config.maxConsecutiveFailures) {
                    const wasReachable = this.isServerReachable;
                    this.isServerReachable = false;

                    if (wasReachable) {
                        console.warn(
                            `🌐 Server unreachable after ${this.consecutiveFailures} failures`
                        );
                        this.emit("network:server_unreachable", { error: error.message });
                        this.emit("network:status", {
                            isOnline: navigator.onLine,
                            isServerReachable: false,
                            reason: "server_unreachable",
                        });
                    }
                }
            }

            return false;
        }
    }

    // Get current network status
    getStatus() {
        return {
            isOnline: this.isOnline,
            isServerReachable: this.isServerReachable,
            lastPingTime: this.lastPingTime,
            consecutiveFailures: this.consecutiveFailures,
        };
    }

    // Check if network is healthy (both browser online and server reachable)
    isHealthy() {
        return this.isOnline && this.isServerReachable;
    }

    // Force a connectivity check
    async checkConnectivity() {
        return await this.pingServer();
    }

    // Cleanup
    destroy() {
        window.removeEventListener("online", this.handleOnline);
        window.removeEventListener("offline", this.handleOffline);

        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        this.removeAllListeners();
        console.log("🌐 NetworkService destroyed");
    }
}

// Create singleton instance
const networkService = new NetworkService();

// Register with logout manager
try {
    logoutManager.registerService("NetworkService", async () => {
        try {
            networkService.destroy();
        } catch (_) { }
    });
} catch (_) { }

export default networkService;
