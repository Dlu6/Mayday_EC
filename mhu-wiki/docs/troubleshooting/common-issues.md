---
sidebar_position: 1
---

# Common Issues and Solutions

This guide addresses the most common issues that users and administrators may encounter with the MHU Helpline system and provides step-by-step solutions.

## Agent Interface Issues

### Login Problems

**Issue**: Unable to log in to the agent interface.

**Solutions**:

1. **Verify credentials**: Ensure you're using the correct username and password
2. **Check account status**: Your account may be locked or disabled
3. **Clear browser cache**: Clear your browser's cache and cookies
4. **Try another browser**: Test with a different browser to rule out browser-specific issues
5. **Network connectivity**: Verify your internet connection is working properly

### Status Stuck on "After Call Work"

**Issue**: Agent status remains in "After Call Work" even after completing work.

**Solutions**:

1. **Manual status change**: Try manually changing your status to "Available"
2. **Refresh the interface**: Reload the agent interface
3. **Check for open sessions**: Ensure all client sessions are properly closed
4. **Contact supervisor**: If the issue persists, have a supervisor force your status change

### Call Audio Problems

**Issue**: No audio or poor audio quality during calls.

**Solutions**:

1. **Check audio devices**: Ensure your headset is properly connected
2. **Device permissions**: Verify browser permissions for microphone access
3. **Test audio devices**: Use the audio test function in the softphone
4. **Network quality**: Check your internet connection speed and stability
5. **Update drivers**: Ensure audio device drivers are up to date
6. **Restart softphone**: Close and reopen the softphone application

## Softphone Issues

### Softphone Won't Connect

**Issue**: Softphone shows "Disconnected" or fails to register.

**Solutions**:

1. **Check network**: Ensure you have internet connectivity
2. **Firewall settings**: Verify that required ports are open (WSS 443, RTP range)
3. **Restart application**: Close and reopen the softphone
4. **Reinstall application**: Uninstall and reinstall the softphone
5. **Check server status**: Verify that the SIP server is operational

### Calls Drop Unexpectedly

**Issue**: Calls disconnect in the middle of conversations.

**Solutions**:

1. **Network stability**: Check for network interruptions or bandwidth issues
2. **VPN interference**: Disable VPN if you're using one
3. **Wi-Fi issues**: Try using a wired connection instead of Wi-Fi
4. **Update softphone**: Ensure you're using the latest version
5. **Check logs**: Review softphone logs for error messages

### Echo or Feedback

**Issue**: Callers report hearing echo or feedback during calls.

**Solutions**:

1. **Headset usage**: Always use a headset instead of speakers
2. **Volume levels**: Reduce microphone and speaker volume
3. **Device positioning**: Keep microphone away from speakers
4. **Disable enhancements**: Turn off audio enhancements in your OS
5. **Update drivers**: Ensure audio device drivers are current

## Queue and Routing Issues

### Calls Not Routing to Available Agents

**Issue**: Calls remain in queue despite available agents.

**Solutions**:

1. **Agent status**: Verify agents are set to "Available"
2. **Skill matching**: Check if calls require skills that agents don't have
3. **Queue configuration**: Review queue settings and agent assignments
4. **System restart**: Consider restarting the queue service
5. **Check logs**: Review queue logs for routing errors

### Incorrect Queue Announcements

**Issue**: Callers hear wrong announcements or no announcements.

**Solutions**:

1. **Audio file check**: Verify that announcement files exist and are not corrupted
2. **Queue configuration**: Check announcement settings in the queue configuration
3. **Reload dialplan**: Reload the Asterisk dialplan
4. **File permissions**: Ensure Asterisk has permission to access audio files
5. **Format compatibility**: Verify audio files are in a compatible format

## Client Data Issues

### Unable to Create Client Sessions

**Issue**: Error when trying to create or update client sessions.

**Solutions**:

1. **Required fields**: Ensure all required fields are completed
2. **Session conflicts**: Check if another agent has the client record open
3. **Database connectivity**: Verify connection to the MongoDB database
4. **Clear cache**: Clear browser cache and reload the application
5. **Permission check**: Verify you have permission to create sessions

### Missing Client Data

**Issue**: Previously entered client data is missing.

**Solutions**:

1. **Search parameters**: Verify you're using correct search criteria
2. **Database replication**: Check if database replication is working properly
3. **Backup restoration**: Consider restoring from a recent backup
4. **Audit logs**: Review audit logs for changes to the record
5. **Data migration issues**: Check if recent data migrations were successful

## System Administration Issues

### IVR Changes Not Taking Effect

**Issue**: Changes to IVR flows are not reflected in the live system.

**Solutions**:

1. **Publish status**: Ensure changes were published, not just saved
2. **Dialplan reload**: Reload the Asterisk dialplan
3. **Cache clearing**: Clear any system caches
4. **Syntax errors**: Check for errors in the IVR configuration
5. **Service restart**: Consider restarting related services

### Trunk Registration Failures

**Issue**: SIP trunks show as unregistered or unavailable.

**Solutions**:

1. **Credentials**: Verify trunk username and password
2. **Network connectivity**: Check connectivity to the provider
3. **Firewall rules**: Ensure required ports are open
4. **Provider status**: Verify the provider service is operational
5. **SIP settings**: Review advanced SIP settings for compatibility issues

### Report Generation Errors

**Issue**: Unable to generate or view reports.

**Solutions**:

1. **Date range**: Try a smaller date range for complex reports
2. **Database connectivity**: Verify connection to the reporting database
3. **User permissions**: Check if you have permission to access reports
4. **Browser compatibility**: Try a different browser
5. **Clear cache**: Clear browser cache and cookies

## Advanced Troubleshooting

For issues that persist after trying the solutions above, try these advanced troubleshooting steps:

### System Logs

Access and review system logs:

1. Asterisk logs: `/var/log/asterisk/full`
2. Web application logs: Check the application server logs
3. Database logs: Review MongoDB and SQL logs for errors

### Network Diagnostics

Perform network diagnostics:

1. **Ping test**: Check connectivity to key servers
2. **Traceroute**: Identify network path issues
3. **Packet capture**: Analyze SIP and RTP traffic for issues

### Support Resources

If you still can't resolve the issue:

1. **Internal support**: Contact your system administrator
2. **Vendor support**: Submit a support ticket to the MHU Helpline support team
3. **Community forums**: Check if others have encountered similar issues

## Preventative Measures

To minimize future issues:

1. **Regular updates**: Keep all system components updated
2. **Proactive monitoring**: Implement monitoring for key system metrics
3. **User training**: Ensure all users are properly trained
4. **Backup strategy**: Maintain regular backups of all system data
5. **Documentation**: Keep system configuration documentation current
