---
sidebar_position: 2
---

# Queue Configuration

This guide explains how to configure and manage call queues in the MHU Helpline system, including queue creation, agent assignment, and optimization strategies.

## Queue Fundamentals

Call queues are a critical component of the MHU Helpline system, allowing incoming calls to be distributed efficiently among available agents based on predefined rules and priorities.

### Queue Components

A queue consists of several key components:

- **Queue Name**: A unique identifier for the queue
- **Queue Strategy**: The method used to distribute calls to agents
- **Agents**: Staff members assigned to handle calls in the queue
- **Announcements**: Audio messages played to callers while waiting
- **Timeout Rules**: Actions to take when wait thresholds are exceeded
- **Priority Settings**: Determining which calls are answered first
- **Operating Hours**: When the queue is active

## Creating a New Queue

### Step 1: Access Queue Management

1. Log in to the MHU Helpline admin portal
2. Navigate to **Voice → Voice Queues**
3. Click the **Add Queue** button

### Step 2: Configure Basic Queue Settings

Fill in the basic queue information:

- **Queue Name**: Enter a descriptive name (e.g., "Mental Health Support")
- **Queue Extension**: Assign a unique extension number
- **Description**: Add details about the queue's purpose
- **Status**: Set to "Active" to enable the queue

### Step 3: Set Distribution Strategy

Choose how calls will be distributed to agents:

- **Ring All**: Ring all available agents simultaneously
- **Round Robin**: Distribute calls evenly in a circular pattern
- **Least Recent**: Ring the agent who has been idle the longest
- **Fewest Calls**: Ring the agent who has taken the fewest calls
- **Random**: Randomly select an available agent
- **Memory Round Robin**: Remember the last agent called and continue the pattern
- **Skill-based**: Route based on agent skill levels (if enabled)

### Step 4: Configure Queue Announcements

Set up the audio experience for callers in the queue:

- **Welcome Message**: The initial announcement played when a caller enters the queue
- **Periodic Announcements**: Messages played at regular intervals while waiting
- **Hold Music**: Background audio played between announcements
- **Position Announcements**: Whether to announce the caller's position in queue
- **Wait Time Announcements**: Whether to announce estimated wait times

To upload custom announcements:

1. Go to **Tools → Audio Manager**
2. Upload your audio files in WAV or MP3 format
3. Return to the queue configuration and select your custom files

### Step 5: Set Timeout and Overflow Rules

Configure what happens when wait thresholds are exceeded:

- **Maximum Wait Time**: The longest a caller should wait in queue
- **Timeout Destination**: Where to route calls that exceed the maximum wait time
- **Overflow Threshold**: The maximum number of callers allowed in the queue
- **Overflow Destination**: Where to route calls when the queue is full

### Step 6: Assign Agents to the Queue

Add agents who will handle calls from this queue:

1. Click the **Agents** tab in the queue configuration
2. Search for agents by name or extension
3. Select agents to add to the queue
4. Set agent-specific parameters:
   - **Penalty**: Higher values make the agent less likely to receive calls
   - **Skills**: Assign skill levels if using skill-based routing
   - **Maximum Calls**: Limit concurrent calls for this agent in this queue

### Step 7: Set Operating Hours

Define when the queue is active:

1. Click the **Hours** tab in the queue configuration
2. Set the default operating hours for each day of the week
3. Configure special hours for holidays or events
4. Specify the destination for calls outside operating hours

### Step 8: Save and Activate

1. Review all queue settings
2. Click **Save** to store the configuration
3. Click **Apply Changes** to make the queue active in the system

## Managing Existing Queues

### Modifying Queue Settings

To update an existing queue:

1. Navigate to **Voice → Voice Queues**
2. Click on the queue you wish to modify
3. Make your changes to any of the queue parameters
4. Click **Save** and **Apply Changes**

### Monitoring Queue Performance

Use the real-time dashboard to monitor queue activity:

1. Navigate to **Dashboard → Queue Stats**
2. View key metrics:
   - **Calls in Queue**: Current number of waiting calls
   - **Average Wait Time**: How long callers are waiting
   - **Service Level**: Percentage of calls answered within threshold
   - **Abandoned Calls**: Calls where callers hung up while waiting
   - **Agent Status**: Current status of all agents assigned to the queue

### Queue Reports

Generate reports to analyze queue performance over time:

1. Navigate to **Analytics → Reports**
2. Select **Queue Reports** from the report types
3. Choose the queue and date range
4. Select metrics to include in the report
5. Generate the report in your preferred format (PDF, CSV, etc.)

## Advanced Queue Configuration

### Skill-Based Routing

To implement skill-based routing:

1. Define skills in the **System Settings → Skills** section
2. Assign skill levels to agents (0-100) in their agent profiles
3. Configure queues to use skill-based routing
4. Set minimum skill levels required for specific call types

### Priority Queues

To set up call prioritization:

1. Navigate to **Voice → Voice Queues**
2. Select the queue to modify
3. Click the **Advanced** tab
4. Set the queue priority (higher numbers = higher priority)
5. Configure caller priority rules based on:
   - Caller ID
   - Wait time
   - Previous interactions
   - IVR selections

### Callback Options

To enable queue callbacks:

1. Navigate to **Voice → Voice Queues**
2. Select the queue to modify
3. Click the **Callback** tab
4. Enable the callback feature
5. Configure callback options:
   - **Threshold**: Wait time before offering callback
   - **Retry Attempts**: How many times to attempt callbacks
   - **Retry Interval**: Time between callback attempts
   - **Agent Selection**: Which agents can process callbacks

### Queue Chaining

To create a chain of queues for overflow:

1. Configure your primary queue
2. Set up secondary queues
3. In the primary queue's overflow settings, select a secondary queue as the destination
4. Configure timeout rules to move calls between queues
5. Set appropriate priority levels to ensure proper call handling

## Queue Optimization Strategies

### Balancing Agent Workload

To ensure even distribution of calls:

- Use the "Fewest Calls" or "Least Recent" distribution strategy
- Adjust agent penalties to fine-tune call distribution
- Monitor agent metrics and adjust assignments as needed
- Consider time-based routing for agents with varying availability

### Reducing Wait Times

Strategies to minimize caller wait times:

- Ensure adequate agent staffing during peak hours
- Implement callback options for high-volume periods
- Use skills-based routing to match callers with appropriate agents
- Configure IVR to pre-qualify calls before they enter queues
- Set up overflow queues for handling spikes in call volume

### Improving First Call Resolution

To increase the rate of issues resolved on the first call:

- Route calls to agents with appropriate skills
- Provide agents with comprehensive knowledge base access
- Minimize unnecessary transfers between queues
- Analyze common reasons for follow-up calls and address root causes

## Troubleshooting Queue Issues

### Common Queue Problems

#### Calls Not Being Distributed

If calls are stuck in queue despite available agents:

1. Check agent status - ensure they are set to "Available"
2. Verify agent queue assignments
3. Check for skill mismatches if using skill-based routing
4. Restart the queue service if necessary

#### Incorrect Announcements

If queue announcements are not playing correctly:

1. Verify audio file formats and quality
2. Check file permissions on the server
3. Confirm announcement settings in the queue configuration
4. Test announcements using the preview feature

#### Abandoned Calls

If you're experiencing high abandonment rates:

1. Analyze wait times and staffing levels
2. Review and improve queue announcements
3. Consider implementing callback options
4. Adjust IVR to set appropriate expectations

## Best Practices

### Queue Design

- Create specialized queues for different types of calls
- Keep queue names clear and consistent
- Document the purpose and settings of each queue
- Regularly review and optimize queue configurations

### Agent Assignment

- Assign agents to queues based on their skills and training
- Consider agent workload when making assignments
- Provide agents with proper training for each queue they serve
- Rotate agents between queues to prevent burnout

### Announcement Design

- Keep announcements clear, concise, and professional
- Update announcements regularly to reflect current information
- Ensure announcements set realistic expectations about wait times
- Test announcements with actual callers to gather feedback

### Performance Monitoring

- Regularly review queue performance metrics
- Set targets for key indicators like answer time and abandonment rate
- Use historical data to forecast staffing needs
- Adjust queue configurations based on performance data

## Next Steps

Now that you understand queue configuration, explore these related topics:

- [IVR Design Guide](./ivr-design.md)
- [Agent Management](./agent-management.md)
- [Call Recording Configuration](./call-recording.md)
- [Reporting and Analytics](./reporting-analytics.md)
