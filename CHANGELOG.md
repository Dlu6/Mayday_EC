# Changelog

All notable changes to the MHU Mayday CRM project.

---

## [5.0.0] - November 27, 2025

### 🚀 New Features

#### Auto-Update System for Electron Softphone
- **In-app updates**: Users can now update the softphone without manually downloading and reinstalling
- **Update notifications**: Automatic detection of new versions with visual notification in the menu
- **Background downloads**: Updates download in the background with progress indicator
- **One-click install**: "Restart & Install" button applies updates seamlessly
- **Menu access**: New "Check for Updates" option in the hamburger menu

#### Custom Confirmation Dialogs
- Replaced native browser dialogs with styled MUI confirmation modals
- Consistent design across all confirmation actions:
  - Delete record confirmation (red/error variant)
  - Logout confirmation (orange/warning variant)  
  - Clear transfer history confirmation (red/error variant)

#### Informed Consent Checkbox
- Changed consent field from radio button to checkbox with green checkmark
- **Form blocking**: Entire form is blurred and disabled until consent is checked
- "Consent Required" overlay message guides users to check the checkbox
- Submit button disabled until consent is given
- Applied to both:
  - Informed Consent for Online Counseling (Section 1)
  - Consent for Feedback Collection (Section 27)

#### Date Range Filter for Client Cards
- New date picker UI to filter client records by date range
- Filter by start date, end date, or both
- Results count updates to show filtered vs total records
- Clear filters with one click

#### Sensitive Data Protection
- Blur effect applied to "Reason" field in client cards
- Hover to reveal sensitive information
- Tooltip shows full text on hover

### 🐛 Bug Fixes

#### Report Date Range Fix
- **Fixed**: Newly created records not appearing in reports for the same day
- **Cause**: End date was set to midnight (00:00:00) excluding records created later that day
- **Solution**: End date now includes full day (23:59:59.999)
- Applied to:
  - `datatool_posts_controller.js` - `getDataToolMetrics()`
  - `enhancedDataToolController.js` - `getComprehensiveDataToolMetrics()`
  - `enhancedDataToolController.js` - `downloadComprehensiveDataToolReport()`

#### Data Validation
- Added enum validation to MongoDB schema for `nationality` and `region` fields
- Prevents invalid dropdown values from being stored in database
- Maintains backward compatibility with empty string values

### 📦 Server & Deployment

#### Auto-Update Server Setup
- Configured nginx `/downloads/` location on production server
- Update files hosted at `https://mhuhelpline.com/downloads/`
- Supports delta updates via blockmap files

#### Documentation Updates
- Complete VM deployment guide with step-by-step commands
- Quick one-liner deployment command
- Auto-update publishing workflow documented
- Nginx configuration documented

---

## Files Changed

### New Files
| File | Description |
|------|-------------|
| `electron-softphone/electron/autoUpdater.js` | Main process auto-update logic |
| `electron-softphone/src/services/updateService.js` | Renderer IPC service for updates |
| `electron-softphone/src/components/AppUpdater.jsx` | Update UI component with dialog |
| `electron-softphone/src/components/ConfirmDialog.jsx` | Reusable confirmation dialog |
| `electron-softphone/scripts/deploy-update.sh` | Automated update deployment script |
| `electron-softphone/scripts/nginx-downloads.conf` | Nginx config for downloads |

### Modified Files
| File | Changes |
|------|---------|
| `electron-softphone/electron/main.js` | Auto-updater initialization |
| `electron-softphone/package.json` | Added electron-updater, electron-log deps |
| `electron-softphone/src/components/Appbar.jsx` | Update menu item, ConfirmDialog for logout |
| `electron-softphone/src/components/Clients.jsx` | Date filter, blur reason, ConfirmDialog for delete |
| `electron-softphone/src/components/ClientFormFields.jsx` | Consent checkbox, form blocking |
| `electron-softphone/src/components/TransferHistory.jsx` | ConfirmDialog for clear history |
| `datatool_server/controllers/datatool_posts_controller.js` | Date range fix |
| `datatool_server/models/datatoolPostsModel.js` | Enum validation |
| `server/controllers/enhancedDataToolController.js` | Date range fix |
| `PROJECT_SETUP.md` | Deployment & auto-update documentation |

---

## Deployment Notes

### For Users
- **Existing users**: Must download v5.0.0 manually one last time
- **Future updates**: Will be delivered automatically via in-app updater

### For Developers
To publish a new version:
```bash
cd electron-softphone
# 1. Bump version in package.json
# 2. Build: npm run build && npm run electron:build:win
# 3. Upload: scp release/X.X.X/* admin@server:/var/www/html/downloads/
```

---

**Full Commit History**:
- `c614f09` - Add Electron auto-update system with AppUpdater UI
- `8620ef6` - Update PROJECT_SETUP.md with complete auto-update deployment docs
