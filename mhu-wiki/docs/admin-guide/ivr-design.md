---
sidebar_position: 3
---

# IVR Design Guide

This guide explains how to design, build, and optimize Interactive Voice Response (IVR) systems using the MHU Helpline IVR Builder.

## IVR Fundamentals

An Interactive Voice Response (IVR) system allows callers to interact with your phone system through voice commands or keypad entries, helping route calls efficiently and provide self-service options.

### Key IVR Components

- **Menus**: Present options to callers
- **Prompts**: Audio messages that guide callers
- **Inputs**: Methods for callers to make selections (DTMF tones, speech)
- **Actions**: System responses to caller inputs
- **Conditions**: Logic that determines call flow based on various factors
- **Destinations**: Where calls are routed after IVR interaction

## Accessing the IVR Builder

1. Log in to the MHU Helpline admin portal
2. Navigate to **IVR → IVR Projects**
3. Click **Create New Project** or select an existing project to edit

## Creating a New IVR Project

### Step 1: Project Setup

1. Enter a **Project Name** (e.g., "Main Helpline IVR")
2. Add a **Description** explaining the IVR's purpose
3. Select a **Language** for the default prompts
4. Click **Create Project**

### Step 2: Design Canvas Overview

The IVR Builder provides a visual canvas with these key areas:

- **Toolbar**: Contains node types and editing tools
- **Canvas**: The workspace where you build your IVR flow
- **Properties Panel**: Configure settings for the selected node
- **Overview Map**: Navigate complex IVR designs
- **Testing Panel**: Simulate caller interactions

### Step 3: Adding the Entry Point

1. Locate the **Entry Point** node in the toolbar
2. Drag it onto the canvas
3. In the properties panel, configure:
   - **Name**: "Main Entry"
   - **Description**: "Starting point for all calls"
   - **Initial Greeting**: Select or upload an audio file

### Step 4: Building the Main Menu

1. Add a **Menu** node from the toolbar
2. Connect the Entry Point to the Menu by dragging from the output connector to the input connector
3. Configure the Menu node:
   - **Name**: "Main Menu"
   - **Prompt**: Select or upload an audio file with menu options
   - **Timeout**: Set how long to wait for input (typically 5-7 seconds)
   - **Retries**: Set how many attempts callers get (typically 2-3)
   - **Invalid Input Handling**: Configure what happens when invalid input is received

### Step 5: Adding Menu Options

For each menu option:

1. Click the **+** button in the Menu node properties
2. Configure each option:
   - **Digit**: The key callers press (1-9, 0, \*, #)
   - **Description**: What this option does
   - **Action**: What happens when this option is selected

### Step 6: Creating Destinations

Add destination nodes for each menu option:

1. Add appropriate nodes from the toolbar (Queue, Voicemail, Announcement, etc.)
2. Connect menu outputs to these destinations
3. Configure each destination's properties

### Step 7: Adding Conditional Logic

To create dynamic call flows:

1. Add a **Condition** node from the toolbar
2. Configure the condition based on:
   - **Time of Day**: Route differently based on business hours
   - **Day of Week**: Special handling for weekends
   - **Queue Status**: Check if queues are full or agents available
   - **Caller Data**: Route based on caller history or information
   - **Custom Variables**: Use system or call variables

### Step 8: Testing Your IVR

1. Click the **Test** button in the toolbar
2. In the testing panel, simulate caller interactions:
   - Enter digits to navigate through menus
   - See the path the call would take
   - Identify any dead ends or logic errors

### Step 9: Saving and Publishing

1. Click **Save** to store your changes
2. Click **Publish** to make the IVR live
3. Select the extension or phone number where this IVR will be active

## Advanced IVR Features

### Text-to-Speech Integration

Instead of recording prompts, you can use text-to-speech:

1. Select a node that requires audio
2. Choose **Text-to-Speech** as the prompt type
3. Enter the text to be spoken
4. Select a voice from the available options
5. Adjust speech rate and tone as needed

### Data Dips and API Integration

To personalize the caller experience:

1. Add a **Data Dip** node from the toolbar
2. Configure the data source:
   - **Database Query**: Look up caller information in your database
   - **API Call**: Retrieve data from external systems
   - **CRM Integration**: Pull client data from your CRM
3. Store retrieved data in call variables
4. Use condition nodes to route based on the retrieved data

### Caller Authentication

To implement secure caller verification:

1. Add an **Authentication** node
2. Configure authentication method:
   - **PIN Verification**: Prompt for a numeric PIN
   - **Account Number**: Request account information
   - **Voice Biometrics**: If supported, use voice recognition
3. Set up verification against your database
4. Configure success and failure paths

### Call Recording Controls

To manage recording within the IVR:

1. Add a **Recording Control** node
2. Configure recording options:
   - **Start Recording**: Begin recording at this point
   - **Pause Recording**: Temporarily stop recording for sensitive information
   - **Resume Recording**: Continue recording after a pause
   - **Stop Recording**: End recording at this point

### Queue Position Announcements

To inform callers about their queue status:

1. Add a **Queue Info** node
2. Configure the announcement:
   - **Position Announcement**: Tell callers their position in queue
   - **Wait Time Estimate**: Provide estimated wait time
   - **Queue Status**: Inform about current queue conditions
3. Set up periodic announcements while in queue

## IVR Design Best Practices

### Menu Design

- **Keep it Simple**: Limit main menu options to 5 or fewer
- **Most Common First**: Place frequently used options early in the menu
- **Consistent Structure**: Use consistent numbering across menus
- **Clear Escape Paths**: Always provide ways to reach an agent or return to the previous menu
- **Zero for Operator**: Follow the convention of using 0 for operator assistance

### Prompt Recording

- **Professional Voice**: Use a clear, professional voice for recordings
- **Consistent Tone**: Maintain the same voice across all prompts
- **Appropriate Pacing**: Speak clearly but not too slowly
- **Concise Language**: Keep prompts brief and to the point
- **Test with Users**: Have actual users listen to prompts for feedback

### Call Flow Optimization

- **Minimize Depth**: Keep the number of menu levels to 3 or fewer
- **Analyze Abandonment**: Identify where callers are hanging up
- **Track Option Usage**: Monitor which options are used most
- **Regular Updates**: Review and update IVR flows quarterly
- **A/B Testing**: Test different prompts or flows to see which performs better

### Accessibility Considerations

- **Timeout Settings**: Provide adequate time for responses
- **Repeat Options**: Allow callers to hear options again
- **Clear Error Handling**: Provide helpful guidance when errors occur
- **Alternative Channels**: Offer options for text or web communication
- **Language Options**: Provide support for multiple languages if needed

## Common IVR Scenarios

### Business Hours Routing

To route calls differently during business hours:

1. Add a **Time Condition** node
2. Configure business hours for each day of the week
3. Create two paths: "During Hours" and "After Hours"
4. Connect to appropriate destinations (queues during hours, voicemail after hours)

### Skill-Based Routing

To route callers to appropriately skilled agents:

1. In the main menu, offer options that identify the caller's need
2. Based on selections, route to specialized queues with skilled agents
3. Use data dips to identify returning callers and their history
4. Route high-priority or complex issues to senior agents

### Self-Service Options

To allow callers to complete tasks without an agent:

1. Design menu options for common self-service tasks
2. Integrate with backend systems via APIs
3. Provide clear confirmation when tasks are completed
4. Always offer an option to speak with an agent if needed

### Callback Requests

To offer callbacks during high volume periods:

1. Add a **Queue Status** condition to check wait times
2. When wait times exceed thresholds, offer callback option
3. If selected, use a **Callback** node to collect callback information
4. Confirm the callback request before ending the call

## Troubleshooting IVR Issues

### Common Problems and Solutions

#### Callers Getting Stuck

If callers are unable to navigate the IVR:

1. Review call recordings to identify confusion points
2. Simplify complex menu structures
3. Clarify prompts and instructions
4. Add timeout handling to automatically assist stuck callers

#### High Abandonment Rates

If many callers are hanging up during the IVR:

1. Analyze at which point abandonment occurs
2. Shorten lengthy prompts
3. Reduce the number of steps to reach an agent
4. Consider offering immediate queue entry options

#### Incorrect Routing

If calls are being routed to the wrong destinations:

1. Verify condition logic in your IVR flow
2. Test each path through the IVR
3. Check for overlapping conditions
4. Ensure time-based conditions account for holidays and special hours

## Measuring IVR Performance

### Key Metrics to Track

- **Containment Rate**: Percentage of calls handled entirely by the IVR
- **Abandonment Rate**: Percentage of callers who hang up during IVR interaction
- **Transfer Rate**: Percentage of callers who request agent transfer
- **Average IVR Duration**: How long callers spend in the IVR
- **Task Completion Rate**: Success rate for self-service tasks
- **First-Contact Resolution**: Whether issues are resolved on first contact

### Generating IVR Reports

1. Navigate to **Analytics → Reports**
2. Select **IVR Reports** from the report types
3. Choose the IVR project and date range
4. Select metrics to include
5. Generate and analyze the report

## Next Steps

Now that you understand IVR design, explore these related topics:

- [Queue Configuration](./queue-configuration.md)
- [Audio Management](./audio-management.md)
- [Call Flow Design](./call-flow-design.md)
- [System Integration](./system-integration.md)
