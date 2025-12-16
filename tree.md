# Mayday_EC Project Tree

> Last updated: December 16, 2025
> 
> **Note:** Excludes `node_modules`, `build`, `release`, `dist`, and `.docusaurus` directories

```
.
|-- client
|   |-- public
|   |   |-- favicon.ico
|   |   |-- index.html
|   |   |-- logo192.png
|   |   |-- logo512.png
|   |   |-- manifest.json
|   |   `-- robots.txt
|   |-- src
|   |   |-- api
|   |   |   |-- apiClient.js
|   |   |   `-- apiService.js
|   |   |-- assets
|   |   |   |-- images
|   |   |   |   |-- mhu_logo.jpg
|   |   |   |   `-- tech.png
|   |   |   |-- 404.json
|   |   |   `-- tableLoadingIndicator.json
|   |   |-- auth
|   |   |   `-- UserContext.js
|   |   |-- components
|   |   |   |-- Routes
|   |   |   |   |-- applications
|   |   |   |   |   |-- DialApplication.js
|   |   |   |   |   `-- QueueApplication.js
|   |   |   |   |-- AppEditDialog.js
|   |   |   |   |-- InboundRoute.js
|   |   |   |   |-- InboundRouteEdit.js
|   |   |   |   |-- IntervalDialog.js
|   |   |   |   |-- OutboundRoute.js
|   |   |   |   |-- OutboundRouteDialog.js
|   |   |   |   |-- OutboundRouteEdit.js
|   |   |   |   |-- Recordings.js
|   |   |   |   `-- appConfigFields.js
|   |   |   |-- auth
|   |   |   |   `-- LogoutButton.js
|   |   |   |-- common
|   |   |   |   `-- LoadingIndicator.js
|   |   |   |-- forms
|   |   |   |   `-- NewAgentForm.js
|   |   |   |-- ivr
|   |   |   |   |-- IVRBuilder.jsx
|   |   |   |   |-- IVRProjects.js
|   |   |   |   `-- blocks.js
|   |   |   |-- tools
|   |   |   |   |-- AudioManager.js
|   |   |   |   `-- Intervals.js
|   |   |   |-- About.js
|   |   |   |-- AgentEdit.js
|   |   |   |-- Agents.js
|   |   |   |-- Analytics.js
|   |   |   |-- ConfirmDialog.jsx
|   |   |   |-- Dashboard.js
|   |   |   |-- DeleteAgent.js
|   |   |   |-- EditNetworkDialog.js
|   |   |   |-- General.js
|   |   |   |-- InboundRouteDialog.js
|   |   |   |-- Integrations.js
|   |   |   |-- Layout.js
|   |   |   |-- LoginForm.js
|   |   |   |-- Networks.jsx
|   |   |   |-- NotFound.js
|   |   |   |-- Odbc.js
|   |   |   |-- Profile.js
|   |   |   |-- ProtectedRoute.js
|   |   |   |-- PublicRoute.js
|   |   |   |-- QueueEdit.js
|   |   |   |-- Realtime.js
|   |   |   |-- Realtime.test.js
|   |   |   |-- ReportsAdminView.js
|   |   |   |-- Settings.jsx
|   |   |   |-- Settings.test.js
|   |   |   |-- Staff.js
|   |   |   |-- Tools.js
|   |   |   |-- TrunkDialog.js
|   |   |   |-- TrunkEdit.js
|   |   |   |-- Trunks.js
|   |   |   |-- Voice.js
|   |   |   |-- VoiceQueueDialog.js
|   |   |   |-- VoiceQueues.js
|   |   |   |-- WhatsappWebConfig.js
|   |   |   `-- intervalsComponent.js
|   |   |-- config
|   |   |-- features
|   |   |   |-- agents
|   |   |   |   `-- agentsSlice.js
|   |   |   |-- audio
|   |   |   |   `-- audioSlice.js
|   |   |   |-- auth
|   |   |   |   `-- authSlice.js
|   |   |   |-- inboundRoutes
|   |   |   |   `-- inboundRouteSlice.js
|   |   |   |-- intervals
|   |   |   |   |-- intervalService.js
|   |   |   |   `-- intervalSlice.js
|   |   |   |-- ivr
|   |   |   |   `-- ivrSlice.js
|   |   |   |-- network
|   |   |   |   `-- networkSlice.js
|   |   |   |-- outboundRoutes
|   |   |   |   `-- outboundRouteSlice.js
|   |   |   |-- recordings
|   |   |   |   `-- recordingsSlice.js
|   |   |   |-- reports
|   |   |   |   `-- reportsSlice.js
|   |   |   |-- trunks
|   |   |   |   `-- trunkSlice.js
|   |   |   `-- voiceQueues
|   |   |       `-- voiceQueueSlice.js
|   |   |-- hooks
|   |   |   |-- useAuth.js
|   |   |   `-- useWebSocket.js
|   |   |-- layouts
|   |   |   |-- DashboardLayout
|   |   |   |   `-- NavBar
|   |   |   `-- MainLayout
|   |   |-- middleware
|   |   |   `-- socketMiddleware.js
|   |   |-- services
|   |   |   |-- callStatsService.js
|   |   |   |-- cdrService.js
|   |   |   `-- websocketService.js
|   |   |-- utils
|   |   |   |-- ConfirmDeletionDialog.js
|   |   |   |-- getUserRoutes.js
|   |   |   `-- jwtUtils.js
|   |   |-- App.css
|   |   |-- App.js
|   |   |-- App.test.js
|   |   |-- index.css
|   |   |-- index.js
|   |   |-- logo.svg
|   |   |-- reportWebVitals.js
|   |   |-- setupTests.js
|   |   `-- store.js
|   |-- README.md
|   |-- image-1.png
|   |-- image.png
|   |-- package-lock.json
|   `-- package.json
|-- config
|   `-- config.json
|-- context7
|   `-- ami-documentation.md
|-- datatool_server
|   |-- controllers
|   |   |-- datatool_posts_controller.js
|   |   `-- datatool_users_controller.js
|   |-- models
|   |   |-- datatoolPostsModel.js
|   |   `-- datatoolUsersModel.js
|   `-- routes
|       `-- dataToolRoute.js
|-- electron-softphone
|   |-- assets
|   |   `-- sounds
|   |-- electron
|   |   |-- Notes ~ Electron
|   |   |-- appbarManager.js
|   |   |-- autoUpdater.js
|   |   |-- main.dev.js
|   |   `-- main.js
|   |-- electron-softphone
|   |   `-- logs
|   |       `-- app-2025-08-12.log
|   |-- native
|   |   `-- win-appbar
|   |       |-- lib
|   |       |   `-- index.js
|   |       |-- src
|   |       |   `-- win_appbar.cpp
|   |       |-- README.md
|   |       |-- binding.gyp
|   |       |-- package-lock.json
|   |       `-- package.json
|   |-- public
|   |   |-- assets
|   |   `-- index.html
|   |-- scripts
|   |   |-- check-native-prerequisites.js
|   |   |-- deploy-update.sh
|   |   `-- nginx-downloads.conf
|   |-- src
|   |   |-- api
|   |   |   |-- datatoolApi.js
|   |   |   `-- reportsApi.js
|   |   |-- assets
|   |   |   |-- sounds
|   |   |   |   |-- promise.mp3
|   |   |   |   `-- ringback.mp3
|   |   |   |-- Mayday Appbar
|   |   |   |-- mayday bar
|   |   |   |-- mayday_appbar
|   |   |   `-- mhu_logo.jpg
|   |   |-- components
|   |   |   |-- AgentDirectory.jsx
|   |   |   |-- AgentStatus.jsx
|   |   |   |-- AppUpdater.jsx
|   |   |   |-- Appbar.jsx
|   |   |   |-- CallHistory.jsx
|   |   |   |-- CallPopup.jsx
|   |   |   |-- Campaigns.jsx
|   |   |   |-- ClientDetailView.jsx
|   |   |   |-- ClientFormFields.jsx
|   |   |   |-- Clients.jsx
|   |   |   |-- ConfirmDialog.jsx
|   |   |   |-- Contacts.jsx
|   |   |   |-- ContentFrame.jsx
|   |   |   |-- DashboardView.jsx
|   |   |   |-- DialPad.jsx
|   |   |   |-- EmailView.jsx
|   |   |   |-- ErrorBoundary.jsx
|   |   |   |-- FacebookView.jsx
|   |   |   |-- Login.jsx
|   |   |   |-- Pagination.jsx
|   |   |   |-- PhonebarInfo.jsx
|   |   |   |-- QueueStatus.jsx
|   |   |   |-- ReportsElectron.jsx
|   |   |   |-- SessionAnalytics.jsx
|   |   |   |-- TransferHistory.jsx
|   |   |   |-- WebSocketStatus.jsx
|   |   |   |-- WhatsAppElectronComponent.jsx
|   |   |   `-- districts.js
|   |   |-- config
|   |   |   |-- appbarConfig.js
|   |   |   |-- config.js
|   |   |   |-- environment.js
|   |   |   `-- sipConfig.js
|   |   |-- contexts
|   |   |   `-- NotificationContext.jsx
|   |   |-- features
|   |   |   |-- calls
|   |   |   |   `-- callSlice.js
|   |   |   `-- extension
|   |   |       |-- extensionSelectors.js
|   |   |       |-- extensionSlice.js
|   |   |       `-- registrationSlice.js
|   |   |-- hooks
|   |   |   |-- useAuthGuard.js
|   |   |   |-- useAuthState.js
|   |   |   |-- useCallState.js
|   |   |   |-- useSIPEvents.js
|   |   |   |-- useStickyAppbar.js
|   |   |   `-- useWebSocket.js
|   |   |-- main
|   |   |-- services
|   |   |   |-- agentService.js
|   |   |   |-- amiCallService.js
|   |   |   |-- apiInterceptor.js
|   |   |   |-- callHistoryService.js
|   |   |   |-- callMonitoringServiceElectron.js
|   |   |   |-- connectionManager.js
|   |   |   |-- dtmfService.js
|   |   |   |-- logoutManager.js
|   |   |   |-- pauseService.js
|   |   |   |-- pauseService.test.js
|   |   |   |-- queueService.js
|   |   |   |-- realtimeService.js
|   |   |   |-- sipService.js
|   |   |   |-- stickyAppbarService.js
|   |   |   |-- storageService.js
|   |   |   |-- transferHistoryService.js
|   |   |   |-- transferMonitorService.js
|   |   |   |-- updateService.js
|   |   |   |-- websocketService.js
|   |   |   `-- whatsAppService.js
|   |   |-- store
|   |   |   |-- middleware
|   |   |   |   `-- websocketMiddleware.js
|   |   |   `-- index.js
|   |   |-- styles
|   |   |   |-- Login.css
|   |   |   `-- components.css
|   |   |-- utils
|   |   |   `-- statusMappers.js
|   |   |-- App.jsx
|   |   |-- index.css
|   |   |-- main.jsx
|   |   `-- theme.js
|   |-- ATTENDED_TRANSFER_IMPLEMENTATION.md
|   |-- CALL_TRANSFER_DOCUMENTATION.md
|   |-- CONNECTION_MANAGER.md
|   |-- CURSOR.md
|   |-- ELECTRON_URL_FIX.md
|   |-- ENCRYPTED_CREDENTIALS.md
|   |-- MHU_Debian_Mumb.pem
|   |-- Notes
|   |-- REMEMBER_ME_FUNCTIONALITY.md
|   |-- STICKY_APPBAR_IMPLEMENTATION.md
|   |-- TESTING_WEBSOCKET.md
|   |-- TRANSFER_IMPLEMENTATION.md
|   |-- USE_AMI_TRANSFER.md
|   |-- WEBSOCKET_RECONNECTION.md
|   |-- WINDOWS_BUILD_INSTRUCTIONS.md
|   |-- electron-builder.json
|   |-- index.html
|   |-- package-lock.json
|   |-- package.json
|   |-- test-blind-transfer.js
|   |-- test-config.json
|   |-- test-websocket-reconnection.cjs
|   `-- vite.config.js
|-- logs
|-- mhu-wiki
|   |-- blog
|   |   |-- 2021-08-26-welcome
|   |   |   `-- docusaurus-plushie-banner.jpeg
|   |   |-- 2024-05-22-welcome-documentation.md
|   |   |-- authors.yml
|   |   `-- tags.yml
|   |-- docs
|   |   |-- admin-guide
|   |   |   |-- _category_.json
|   |   |   |-- ivr-design.md
|   |   |   |-- queue-configuration.md
|   |   |   `-- system-overview.md
|   |   |-- technical-reference
|   |   |   |-- _category_.json
|   |   |   |-- api-integration.md
|   |   |   `-- softphone-architecture.md
|   |   |-- troubleshooting
|   |   |   |-- _category_.json
|   |   |   `-- common-issues.md
|   |   |-- tutorial-basics
|   |   |   |-- _category_.json
|   |   |   |-- congratulations.md
|   |   |   |-- create-a-blog-post.md
|   |   |   |-- create-a-document.md
|   |   |   |-- create-a-page.md
|   |   |   |-- deploy-your-site.md
|   |   |   `-- markdown-features.mdx
|   |   |-- tutorial-extras
|   |   |   |-- img
|   |   |   |   |-- docsVersionDropdown.png
|   |   |   |   `-- localeDropdown.png
|   |   |   |-- _category_.json
|   |   |   |-- manage-docs-versions.md
|   |   |   `-- translate-your-site.md
|   |   |-- upload-documentation
|   |   |   |-- 01-setup.md
|   |   |   |-- 02-create-content.md
|   |   |   |-- 03-customize-site.md
|   |   |   |-- 04-local-development.md
|   |   |   |-- 05-deployment.md
|   |   |   `-- _category_.json
|   |   |-- user-guide
|   |   |   |-- img
|   |   |   |   `-- login-screen.png
|   |   |   |-- _category_.json
|   |   |   |-- call-handling.md
|   |   |   `-- getting-started.md
|   |   `-- intro.md
|   |-- src
|   |   |-- components
|   |   |   `-- HomepageFeatures
|   |   |       |-- index.js
|   |   |       `-- styles.module.css
|   |   |-- css
|   |   |   `-- custom.css
|   |   `-- pages
|   |       |-- index.js
|   |       |-- index.module.css
|   |       `-- markdown-page.md
|   |-- static
|   |   `-- img
|   |       |-- docusaurus-social-card.jpg
|   |       |-- docusaurus.png
|   |       |-- favicon.ico
|   |       |-- logo.svg
|   |       |-- logo2.svg
|   |       |-- mhu_logo.jpg
|   |       |-- undraw_docusaurus_mountain.svg
|   |       |-- undraw_docusaurus_react.svg
|   |       `-- undraw_docusaurus_tree.svg
|   |-- README.md
|   |-- docusaurus.config.js
|   |-- package-lock.json
|   |-- package.json
|   `-- sidebars.js
|-- models
|   `-- index.js
|-- public
|-- scripts
|   |-- db-manager.sh
|   |-- db-monitor.js
|   `-- setup-dev-env.sh
|-- seeders
|-- server
|   |-- app
|   |   `-- initEventListeners.js
|   |-- config
|   |   |-- asterisk
|   |   |-- swagger
|   |   |   |-- definitions.js
|   |   |   `-- paths.js
|   |   |-- AsteriskAriXXX.js
|   |   |-- amiClient.js
|   |   |-- appNames.js
|   |   |-- asterisk.js
|   |   |-- db.js
|   |   |-- odbc.js
|   |   `-- sequelize.js
|   |-- controllers
|   |   |-- adminStatsController.js
|   |   |-- asteriskController.mjs
|   |   |-- callsController.js
|   |   |-- cdrController.js
|   |   |-- enhancedDataToolController.js
|   |   |-- enhancedTransferController.js
|   |   |-- inboundRouteController.js
|   |   |-- intervalController.js
|   |   |-- ivrController.js
|   |   |-- networkConfigController.js
|   |   |-- odbcController.js
|   |   |-- outboundRouteController.js
|   |   |-- pauseController.js
|   |   |-- reportsController.js
|   |   |-- sipController.js
|   |   |-- soundFileController.js
|   |   |-- systemController.js
|   |   |-- transferController.js
|   |   |-- transferHealthController.js
|   |   |-- trunkController.js
|   |   |-- usersController.js
|   |   |-- voiceQueueController.js
|   |   `-- whatsappController.js
|   |-- cronjobs
|   |   `-- scheduledTasks.js
|   |-- middleware
|   |   |-- authMiddleware.js
|   |   |-- dateValidation.js
|   |   `-- sipAuth.js
|   |-- migrations
|   |   `-- add_pause_columns.sql
|   |-- models
|   |   |-- IVRModel.js
|   |   |-- UsersModel.js
|   |   |-- WhatsAppModel.js
|   |   |-- associations.js
|   |   |-- asteriskModels.js
|   |   |-- callRecordsModel.js
|   |   |-- cdr.js
|   |   |-- inboundRouteModel.js
|   |   |-- intervalModel.js
|   |   |-- networkConfigModel.js
|   |   |-- networkModel.js
|   |   |-- odbcModel.js
|   |   |-- outboundRouteModel.js
|   |   |-- pauseReasonModel.js
|   |   |-- pjsipModel.js
|   |   |-- pjsipReportingModels.js
|   |   |-- queueMemberModel.js
|   |   |-- recordingRatingModel.js
|   |   |-- sipModel.js
|   |   |-- soundFileModel.js
|   |   |-- trunkModel.js
|   |   |-- voiceExtensionModel.js
|   |   |-- voiceQueueModel.js
|   |   `-- whatsappAssociations.js
|   |-- routes
|   |   |-- CdrRoute.js
|   |   |-- UsersRoute.js
|   |   |-- adminRoutes.js
|   |   |-- amiRoutes.js
|   |   |-- asteriskRoute.mjs
|   |   |-- callsRoutes.js
|   |   |-- enhancedDataToolRoutes.js
|   |   |-- enhancedTransferRoutes.js
|   |   |-- inboundRoute.mjs
|   |   |-- intervalRoutes.js
|   |   |-- ivrRoutes.js
|   |   |-- networkConfigRoutes.js
|   |   |-- odbcRoutes.js
|   |   |-- outboundEndpoints.mjs
|   |   |-- pauseRoutes.js
|   |   |-- recordingRoutes.js
|   |   |-- reportsRoute.js
|   |   |-- soundFileRoutes.js
|   |   |-- systemRoute.js
|   |   |-- transferRoutes.js
|   |   |-- trunkRoute.mjs
|   |   |-- voiceQueueRoute.mjs
|   |   `-- whatsappRoutes.js
|   |-- scripts
|   |   `-- migrate-emails.js
|   |-- services
|   |   |-- amiService.js
|   |   |-- ariService.js
|   |   |-- callMonitoringService.js
|   |   |-- eventBus.js
|   |   |-- fastAGIService.js
|   |   |-- odbcService.js
|   |   |-- pauseSchedulerService.js
|   |   |-- socketService.js
|   |   `-- userService.js
|   |-- tests
|   |   |-- pauseController.test.js
|   |   `-- pauseIntegration.test.js
|   |-- types
|   |-- utils
|   |   |-- asteriskConfigWriter.js
|   |   |-- auth.js
|   |   |-- extensionGenerator.js
|   |   |-- logger.js
|   |   |-- setupDefaultIntervals.js
|   |   `-- setupIVRConfig.js
|   |-- chalk
|   |-- jest.config.js
|   `-- server.js
|-- AMI_AGENT_AVAILABILITY_IMPLEMENTATION.md
|-- AMI_TRANSFER_IMPLEMENTATION.md
|-- Asterisk_AMI_Postman_Collection.json
|-- CHANGELOG.md
|-- CLEANUP_SUMMARY.md
|-- CLIENT_DASHBOARD_ALIGNMENT.md
|-- DATABASE_TRACKING_SUMMARY.md
|-- DETAILED_CALL_DISTRIBUTION_REPORT.md
|-- DEVELOPMENT_STATUS.md
|-- ENHANCED_REPORTING_SYSTEM.md
|-- IMPLEMENTATION_SUMMARY.md
|-- IP_UPDATE_SUMMARY.md
|-- Note To Self
|-- Note.md
|-- PROJECT_SETUP.md
|-- Postman_AMI_HTTP_Collection.json
|-- Proposed project tree
|-- README.md
|-- RELEASE_NOTES.md
|-- SESSION_ALIGNMENT_IMPLEMENTATION.md
|-- System Architecture and Development Guide
|-- Todo
|-- WHATSAPP_API_ERROR_FIX.md
|-- babel.config.cjs
|-- backup_asterisk.sh
|-- craco.config.cjs
|-- docker-elk.yml
|-- ecosystem.config.cjs
|-- example.nginx.conf
|-- install_asterisk_mariadb_locale.sh
|-- lastworking asteriks configs 21 Nov 24
|-- mcp-server-config.json
|-- package-lock.json
|-- package.json
|-- restore_asterisk
|-- run-migration.sh
|-- test-ami-agent-availability.js
|-- test-ami-transfer.js
|-- test-websocket-reconnection.cjs
`-- update_and_restart_after_gitpull.sh

115 directories, 436 files
```

## Directory Overview

| Directory | Description |
|-----------|-------------|
| `client/` | React admin dashboard (CRA) |
| `config/` | Configuration files |
| `context7/` | AMI documentation |
| `datatool_server/` | Data tool microservice |
| `electron-softphone/` | Electron desktop softphone app |
| `logs/` | Application logs |
| `mhu-wiki/` | Docusaurus documentation site |
| `models/` | Shared Sequelize models |
| `public/` | Static public assets |
| `scripts/` | Utility scripts |
| `seeders/` | Database seeders |
| `server/` | Express.js backend API |
