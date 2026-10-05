package com.paoa.ui.screens.assistant

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.paoa.core.ai.ApiKeyManager
import com.paoa.core.ai.GeminiClient
import com.paoa.core.ai.IntentRouter
import com.paoa.core.context.ContextEngine
import com.paoa.core.reminders.AlarmScheduler
import com.paoa.core.scheduler.DynamicRescheduler
import com.paoa.core.scheduler.SmartSchedulingEngine
import com.paoa.core.voice.SpeechRecognizerHelper
import com.paoa.core.voice.TextToSpeechHelper
import com.paoa.data.local.PAOADatabase
import com.paoa.data.local.entities.MessageEntity
import com.paoa.data.repository.MemoryRepository
import com.paoa.data.repository.ScheduleRepository
import com.paoa.data.repository.TaskRepository
import com.paoa.domain.model.Priority
import com.paoa.domain.model.Task
import com.paoa.domain.model.TaskCategory
import com.paoa.domain.model.UserIntent
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class AssistantViewModel(application: Application) : AndroidViewModel(application) {

    private val database = PAOADatabase.getInstance(application)
    private val taskRepository = TaskRepository(database)
    private val scheduleRepository = ScheduleRepository(database)
    private val memoryRepository = MemoryRepository(database)
    private val apiKeyManager = ApiKeyManager(application)

    private val schedulingEngine = SmartSchedulingEngine()
    private val dynamicRescheduler = DynamicRescheduler(schedulingEngine)
    private val contextEngine = ContextEngine()
    private val alarmScheduler = AlarmScheduler(application)

    private val speechHelper = SpeechRecognizerHelper(application)
    private val ttsHelper = TextToSpeechHelper(application)

    data class ChatMessage(
        val role: String, // "USER" or "ASSISTANT"
        val content: String,
        val timestamp: Long = System.currentTimeMillis()
    )

    data class AssistantUiState(
        val messages: List<ChatMessage> = emptyList(),
        val isListening: Boolean = false,
        val partialVoiceText: String = "",
        val isSpeaking: Boolean = false,
        val isThinking: Boolean = false,
        val hasApiKey: Boolean = false
    )

    private val _uiState = MutableStateFlow(AssistantUiState())
    val uiState: StateFlow<AssistantUiState> = _uiState.asStateFlow()

    init {
        refreshApiKeyStatus()
        // Initial greeting
        _uiState.value = _uiState.value.copy(
            messages = listOf(
                ChatMessage(
                    role = "ASSISTANT",
                    content = if (apiKeyManager.isGeminiEnabled()) {
                        "Hello! I am PAOA, powered by Gemini. Ask me anything, plan your day, or tell me when your schedule changes."
                    } else {
                        "Hello! I am your personal operating assistant. You can speak or type your plans, ask what to do next, or tell me when your day changes."
                    }
                )
            )
        )

        observeSpeechRecognition()
    }

    fun refreshApiKeyStatus() {
        _uiState.value = _uiState.value.copy(hasApiKey = apiKeyManager.isGeminiEnabled())
    }

    private fun observeSpeechRecognition() {
        viewModelScope.launch {
            speechHelper.state.collect { state ->
                when (state) {
                    is SpeechRecognizerHelper.SpeechState.Listening -> {
                        _uiState.value = _uiState.value.copy(isListening = true, partialVoiceText = "")
                    }
                    is SpeechRecognizerHelper.SpeechState.PartialResult -> {
                        _uiState.value = _uiState.value.copy(partialVoiceText = state.text)
                    }
                    is SpeechRecognizerHelper.SpeechState.FinalResult -> {
                        _uiState.value = _uiState.value.copy(isListening = false, partialVoiceText = "")
                        processUserInput(state.text, isVoice = true)
                    }
                    is SpeechRecognizerHelper.SpeechState.Error -> {
                        _uiState.value = _uiState.value.copy(isListening = false)
                    }
                    is SpeechRecognizerHelper.SpeechState.Idle -> {
                        _uiState.value = _uiState.value.copy(isListening = false)
                    }
                }
            }
        }
    }

    fun toggleVoiceInput() {
        if (_uiState.value.isListening) {
            speechHelper.stopListening()
        } else {
            ttsHelper.stop()
            speechHelper.startListening()
        }
    }

    fun sendTextMessage(input: String) {
        if (input.isBlank()) return
        processUserInput(input, isVoice = false)
    }

    private fun processUserInput(rawText: String, isVoice: Boolean) {
        val userMsg = ChatMessage(role = "USER", content = rawText)
        val updatedList = _uiState.value.messages + userMsg
        _uiState.value = _uiState.value.copy(
            messages = updatedList,
            isThinking = true
        )

        viewModelScope.launch {
            // Save to database
            database.conversationDao().insertMessage(
                MessageEntity(
                    conversationId = 1L,
                    role = "USER",
                    content = rawText,
                    inputMode = if (isVoice) "VOICE" else "TEXT"
                )
            )

            var responseText: String
            val apiKey = apiKeyManager.getGeminiApiKey()

            if (!apiKey.isNullOrBlank()) {
                val systemContext = buildSystemContextPrompt()
                val history = updatedList.map { it.role to it.content }
                val geminiResult = GeminiClient.generateResponse(apiKey, history, systemContext)

                if (geminiResult.isSuccess) {
                    val geminiResp = geminiResult.getOrThrow()
                    responseText = geminiResp.replyText
                    for (action in geminiResp.actions) {
                        runCatching { executeAiAction(action) }
                    }
                } else {
                    // Fallback to offline rule engine on failure
                    val intent = IntentRouter.route(rawText)
                    responseText = executeIntent(intent)
                }
            } else {
                // Offline rule engine
                val intent = IntentRouter.route(rawText)
                responseText = executeIntent(intent)
            }

            val assistantMsg = ChatMessage(role = "ASSISTANT", content = responseText)
            _uiState.value = _uiState.value.copy(
                messages = _uiState.value.messages + assistantMsg,
                isThinking = false
            )

            // Save assistant response
            database.conversationDao().insertMessage(
                MessageEntity(
                    conversationId = 1L,
                    role = "ASSISTANT",
                    content = responseText,
                    inputMode = "TEXT"
                )
            )

            // Speak response if voice was used or active
            if (isVoice) {
                ttsHelper.speak(responseText)
            }
        }
    }

    private suspend fun executeIntent(intent: UserIntent): String {
        return when (intent) {
            is UserIntent.WhatShouldIDoNow -> {
                val activeTasks = taskRepository.getActiveTasks()
                val currentBlocks = scheduleRepository.getBlocksInRange(0, Long.MAX_VALUE)
                val recommendation = contextEngine.recommendNextAction(activeTasks, currentBlocks)

                if (recommendation != null) {
                    recommendation.rationale
                } else {
                    "You have no pending tasks right now. Take some time to relax, or tell me what you'd like to accomplish."
                }
            }

            is UserIntent.ScheduleTask -> {
                val newTask = Task(
                    title = intent.title,
                    estimatedDurationMinutes = intent.durationMinutes,
                    priority = intent.priority,
                    category = intent.category,
                    deadline = intent.deadline,
                    preferredTimeOfDay = intent.preferredTimeOfDay
                )
                val taskId = taskRepository.insertTask(newTask)
                val savedTask = newTask.copy(id = taskId)

                // Run scheduler to place task
                val allActive = taskRepository.getActiveTasks()
                val currentBlocks = scheduleRepository.getBlocksInRange(0, Long.MAX_VALUE)
                val scheduleResult = schedulingEngine.scheduleDay(allActive, currentBlocks)

                scheduleRepository.insertBlocks(scheduleResult.scheduledBlocks)

                // Schedule alarm/reminder
                val placedBlock = scheduleResult.scheduledBlocks.find { it.taskId == taskId }
                if (placedBlock != null) {
                    alarmScheduler.scheduleReminder(savedTask, placedBlock)
                }

                val periodText = if (intent.preferredTimeOfDay != null) " in the ${intent.preferredTimeOfDay.lowercase()}" else ""
                "Scheduled '${savedTask.title}' for ${savedTask.estimatedDurationMinutes} minutes$periodText. I've set a reminder accordingly."
            }

            is UserIntent.RescheduleTask -> {
                val matched = taskRepository.findTasksByTitle(intent.taskQuery).firstOrNull()
                if (matched != null) {
                    taskRepository.markTaskPostponed(matched.id)
                    "Moved '${matched.title}' to tomorrow. I've adjusted your remaining schedule to keep your evening balanced."
                } else {
                    "I couldn't find a task matching '${intent.taskQuery}'. Could you clarify the task name?"
                }
            }

            is UserIntent.SetUnavailable -> {
                val cal = Calendar.getInstance()
                cal.add(Calendar.DAY_OF_YEAR, intent.targetDateOffsetDays)
                cal.set(Calendar.HOUR_OF_DAY, intent.startHour)
                cal.set(Calendar.MINUTE, intent.startMinute)
                val startTime = cal.timeInMillis

                cal.set(Calendar.HOUR_OF_DAY, intent.endHour)
                cal.set(Calendar.MINUTE, intent.endMinute)
                val endTime = cal.timeInMillis

                val currentBlocks = scheduleRepository.getBlocksInRange(0, Long.MAX_VALUE)
                val allActive = taskRepository.getActiveTasks()

                val result = dynamicRescheduler.handleUnavailableInterval(
                    unavailableStart = startTime,
                    unavailableEnd = endTime,
                    reason = intent.label,
                    currentBlocks = currentBlocks,
                    allActiveTasks = allActive
                )

                scheduleRepository.replaceUnlockedBlocksInRange(startTime, endTime, result.updatedBlocks)

                result.humanExplanation
            }

            is UserIntent.CompleteTask -> {
                val matched = taskRepository.findTasksByTitle(intent.taskQuery).firstOrNull()
                if (matched != null) {
                    taskRepository.markTaskComplete(matched.id, matched.estimatedDurationMinutes)
                    "Great work on completing '${matched.title}'! I've updated your progress and digital twin focus metrics."
                } else {
                    "I marked your task as completed."
                }
            }

            is UserIntent.ExplainSchedule -> {
                val currentBlocks = scheduleRepository.getBlocksInRange(0, Long.MAX_VALUE)
                val block = if (!intent.taskQuery.isNullOrBlank()) {
                    currentBlocks.find { it.title.contains(intent.taskQuery, ignoreCase = true) }
                } else {
                    currentBlocks.find { it.startTime <= System.currentTimeMillis() && it.endTime >= System.currentTimeMillis() }
                        ?: currentBlocks.firstOrNull()
                }

                if (block != null) {
                    block.scheduleExplanation.ifBlank {
                        "Scheduled here because it aligns with your focus preferences and available time buffer."
                    }
                } else {
                    "I schedule tasks based on your peak focus windows, nearest deadlines, and necessary rest buffers."
                }
            }

            is UserIntent.QueryMemory -> {
                val memories = memoryRepository.getActiveMemories()
                if (memories.isNotEmpty()) {
                    val summary = memories.take(4).joinToString("\n• ") { it.fact }
                    "Here is what I currently know about your rhythm:\n• $summary\n\nYou can review and edit everything in Settings -> What I Know About You."
                } else {
                    "I am learning your schedule patterns. You can customize your routine in Settings."
                }
            }

            is UserIntent.UpdatePreference -> {
                memoryRepository.insertMemory(
                    topic = "USER_PREFERENCE",
                    fact = intent.rawUserStatement,
                    source = "CONVERSATION_EDIT"
                )
                "Understood. I've updated your preferences with: \"${intent.rawUserStatement}\". I will adapt future schedules accordingly."
            }

            is UserIntent.QueryProductivity -> {
                val allTasks = taskRepository.getAllTasks()
                val completed = allTasks.count { it.status == com.paoa.domain.model.TaskStatus.COMPLETED }
                val pending = allTasks.count { it.status == com.paoa.domain.model.TaskStatus.PLANNED }
                "Today you have completed $completed tasks, with $pending remaining. You are maintaining steady focus without overworking."
            }

            is UserIntent.ConversationalChat -> {
                intent.reply
            }

            is UserIntent.DeleteTask -> {
                val matched = taskRepository.findTasksByTitle(intent.taskQuery).firstOrNull()
                if (matched != null) {
                    taskRepository.deleteTask(matched.id)
                    alarmScheduler.cancelReminder(matched.id)
                    "Removed '${matched.title}' and cleared its scheduled blocks from your calendar."
                } else {
                    "I couldn't find a task named '${intent.taskQuery}' to delete."
                }
            }

            is UserIntent.ClearTasks -> {
                taskRepository.clearAll()
                "All tasks and schedule blocks have been cleared."
            }

            is UserIntent.Unknown -> {
                "I'm here to help manage your schedule. To plan something, try saying 'Study DSA for 2 hours tonight' or ask 'What should I do now?'."
            }
        }
    }

    private suspend fun executeAiAction(action: GeminiClient.AiAction) {
        when (action) {
            is GeminiClient.AiAction.ScheduleTask -> {
                val newTask = Task(
                    title = action.title,
                    estimatedDurationMinutes = action.durationMinutes,
                    priority = action.priority,
                    category = action.category
                )
                val taskId = taskRepository.insertTask(newTask)
                val savedTask = newTask.copy(id = taskId)

                val allActive = taskRepository.getActiveTasks()
                val currentBlocks = scheduleRepository.getBlocksInRange(0, Long.MAX_VALUE)
                val scheduleResult = schedulingEngine.scheduleDay(allActive, currentBlocks)

                scheduleRepository.insertBlocks(scheduleResult.scheduledBlocks)

                val placedBlock = scheduleResult.scheduledBlocks.find { it.taskId == taskId }
                if (placedBlock != null) {
                    alarmScheduler.scheduleReminder(savedTask, placedBlock)
                }
            }

            is GeminiClient.AiAction.RescheduleTask -> {
                val matched = taskRepository.findTasksByTitle(action.taskQuery).firstOrNull()
                if (matched != null) {
                    taskRepository.markTaskPostponed(matched.id)
                }
            }

            is GeminiClient.AiAction.DeleteTask -> {
                val matched = taskRepository.findTasksByTitle(action.taskQuery).firstOrNull()
                if (matched != null) {
                    taskRepository.deleteTask(matched.id)
                    alarmScheduler.cancelReminder(matched.id)
                }
            }

            is GeminiClient.AiAction.ClearAllTasks -> {
                taskRepository.clearAll()
            }

            is GeminiClient.AiAction.CompleteTask -> {
                val matched = taskRepository.findTasksByTitle(action.taskQuery).firstOrNull()
                if (matched != null) {
                    taskRepository.markTaskComplete(matched.id, matched.estimatedDurationMinutes)
                }
            }

            is GeminiClient.AiAction.SetUnavailable -> {
                val cal = Calendar.getInstance()
                cal.set(Calendar.HOUR_OF_DAY, action.startHour)
                cal.set(Calendar.MINUTE, action.startMinute)
                val startTime = cal.timeInMillis

                cal.set(Calendar.HOUR_OF_DAY, action.endHour)
                cal.set(Calendar.MINUTE, action.endMinute)
                val endTime = cal.timeInMillis

                val currentBlocks = scheduleRepository.getBlocksInRange(0, Long.MAX_VALUE)
                val allActive = taskRepository.getActiveTasks()

                val result = dynamicRescheduler.handleUnavailableInterval(
                    unavailableStart = startTime,
                    unavailableEnd = endTime,
                    reason = action.label,
                    currentBlocks = currentBlocks,
                    allActiveTasks = allActive
                )

                scheduleRepository.replaceUnlockedBlocksInRange(startTime, endTime, result.updatedBlocks)
            }

            is GeminiClient.AiAction.UpdatePreference -> {
                memoryRepository.insertMemory(
                    topic = action.key,
                    fact = action.value,
                    source = "CONVERSATION_EDIT"
                )
            }
        }
    }

    private suspend fun buildSystemContextPrompt(): String {
        val profile = memoryRepository.getProfile()
        val memories = memoryRepository.getActiveMemories()
        val activeTasks = taskRepository.getActiveTasks()

        val cal = Calendar.getInstance()
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        val startOfDay = cal.timeInMillis
        cal.set(Calendar.HOUR_OF_DAY, 23)
        cal.set(Calendar.MINUTE, 59)
        val endOfDay = cal.timeInMillis
        val todayBlocks = scheduleRepository.getBlocksInRange(startOfDay, endOfDay)

        val dateFormat = SimpleDateFormat("EEEE, MMMM d, yyyy 'at' h:mm a", Locale.getDefault())
        val currentTimeStr = dateFormat.format(Date())

        val memoryBullets = if (memories.isNotEmpty()) {
            memories.joinToString("\n") { "- ${it.topic}: ${it.fact}" }
        } else {
            "- None recorded yet"
        }

        val taskBullets = if (activeTasks.isNotEmpty()) {
            activeTasks.joinToString("\n") { "- '${it.title}' (${it.estimatedDurationMinutes}m, priority: ${it.priority}, category: ${it.category})" }
        } else {
            "- No active tasks"
        }

        val blockBullets = if (todayBlocks.isNotEmpty()) {
            val timeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
            todayBlocks.joinToString("\n") { "- '${it.title}' [${timeFormat.format(Date(it.startTime))} - ${timeFormat.format(Date(it.endTime))}]" }
        } else {
            "- Nothing scheduled yet today"
        }

        return """
You are PAOA (Personal AI Operating Assistant), a smart, hyper-personalized, empathetic, and highly organized AI companion for ${profile.name}.
Current time: $currentTimeStr

ABOUT THE USER (Digital Twin Profile):
- Name: ${profile.name}
- Routine: Typical wake time is ${profile.typicalWakeTime}, typical sleep time is ${profile.typicalSleepTime}.
- Preferred style: ${profile.interactionStyle}
- Peak focus hours: Evening (5:00 PM to 8:00 PM focus bias).
- Average study session length: 50 minutes. Max recommended continuous focus: 90 minutes.
- Buffer between tasks: ${profile.defaultBufferMinutes} minutes.

LEARNED USER MEMORIES & PREFERENCES:
$memoryBullets

CURRENT SCHEDULED BLOCKS TODAY:
$blockBullets

ACTIVE PENDING TASKS:
$taskBullets

HOW TO BEHAVE:
1. Converse naturally, intelligently, warmly, and concisely. Keep answers punchy and conversational suitable for reading or text-to-speech.
2. If the user mentions a vague task without a duration (e.g. "I need to study DSA"), ask how long they'd like to spend or suggest splitting into sessions during their peak hours.
3. If the user asks "What should I do now?", analyze the current time, today's schedule, deadlines, and active tasks, and recommend the single best next action with clear rationale.
4. When you decide to schedule, reschedule, complete, or delete tasks or set an unavailable period, include an action tag at the very end of your response:
<actions>[{"type": "...", ...}]</actions>
Supported action types:
- SCHEDULE_TASK: {"type": "SCHEDULE_TASK", "title": "DSA", "durationMinutes": 60, "targetDateOffsetDays": 0, "startHour": 18, "startMinute": 0, "category": "STUDY", "priority": "IMPORTANT"}
- RESCHEDULE_TASK: {"type": "RESCHEDULE_TASK", "taskQuery": "DSA", "targetDateOffsetDays": 1}
- DELETE_TASK: {"type": "DELETE_TASK", "taskQuery": "Hi"}
- CLEAR_ALL_TASKS: {"type": "CLEAR_ALL_TASKS"}
- COMPLETE_TASK: {"type": "COMPLETE_TASK", "taskQuery": "DBMS"}
- SET_UNAVAILABLE: {"type": "SET_UNAVAILABLE", "startHour": 17, "startMinute": 0, "endHour": 20, "endMinute": 0, "label": "Out with friends"}
- UPDATE_PREFERENCE: {"type": "UPDATE_PREFERENCE", "key": "study_preference", "value": "Prefers evening sessions"}

Always ensure the text outside <actions> is a complete, friendly, and natural conversational reply.
""".trimIndent()
    }

    override fun onCleared() {
        super.onCleared()
        speechHelper.stopListening()
        ttsHelper.shutdown()
    }
}
