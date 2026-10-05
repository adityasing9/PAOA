package com.paoa.core.ai

import com.paoa.domain.model.Priority
import com.paoa.domain.model.TaskCategory
import com.paoa.domain.model.UserIntent
import java.util.regex.Pattern

object DeterministicCommandEngine {

    private val WHAT_NOW_PATTERN = Pattern.compile(
        "^(what\\s+should\\s+i\\s+do(\\s+now)?|what's\\s+next|what\\s+next|next\\s+task|what\\s+to\\s+do)\\??$",
        Pattern.CASE_INSENSITIVE
    )

    private val MOVE_TASK_PATTERN = Pattern.compile(
        "^(move|reschedule|postpone|shift|push)\\s+([a-zA-Z0-9\\s_-]+?)\\s+to\\s+(tomorrow|today|tonight|next\\s+week|(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?))\\??$",
        Pattern.CASE_INSENSITIVE
    )

    private val COMPLETE_TASK_PATTERN = Pattern.compile(
        "^(i\\s+finished|mark|completed?|done\\s+with)\\s+([a-zA-Z0-9\\s_-]+?)(?:\\s+(?:as\\s+)?(?:done|complete|finished))?$",
        Pattern.CASE_INSENSITIVE
    )

    private val UNAVAILABLE_PATTERN = Pattern.compile(
        "^(?:i'm\\s+going\\s+out(?:\\s+with\\s+friends)?|i'll\\s+be\\s+busy|busy|out)\\s+from\\s+(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?)\\s+to\\s+(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?)(?:\\s+for\\s+(.+))?$",
        Pattern.CASE_INSENSITIVE
    )

    private val EXPLAIN_PATTERN = Pattern.compile(
        "^(?:why\\s+did\\s+you\\s+schedule\\s+(.+?)(?:\\s+now)?|why\\s+is\\s+(.+?)\\s+scheduled(?:\\s+now)?|why)\\??$",
        Pattern.CASE_INSENSITIVE
    )

    private val QUERY_MEMORY_PATTERN = Pattern.compile(
        "^(what\\s+do\\s+you\\s+know\\s+about\\s+me|who\\s+am\\s+i|show\\s+memory|show\\s+profile|my\\s+preferences)\\??$",
        Pattern.CASE_INSENSITIVE
    )

    private val PRODUCTIVITY_PATTERN = Pattern.compile(
        "^(how\\s+productive\\s+was\\s+i(?:\\s+today)?|my\\s+productivity|show\\s+stats|today's\\s+progress)\\??$",
        Pattern.CASE_INSENSITIVE
    )

    private val PREFERENCE_UPDATE_PATTERN = Pattern.compile(
        "^i\\s+(don't\\s+like|prefer|hate)\\s+(.+?)(?:\\s+anymore)?$",
        Pattern.CASE_INSENSITIVE
    )

    private val GREETING_PATTERN = Pattern.compile(
        "^(hi|hello|hey|hiya|yo|good\\s+(?:morning|afternoon|evening|day)|greetings)(?:\\s+(?:there|mate|paoa|assistant|friend))?[!.,?\\s\\p{So}\\p{Sk}\\p{Sm}]*$",
        Pattern.CASE_INSENSITIVE
    )

    private val HOW_ARE_YOU_PATTERN = Pattern.compile(
        "^(how\\s+are\\s+you(?:\\s+doing)?|how's\\s+it\\s+going|how\\s+do\\s+you\\s+feel)\\??$",
        Pattern.CASE_INSENSITIVE
    )

    private val WHO_ARE_YOU_PATTERN = Pattern.compile(
        "^(who\\s+are\\s+you|what\\s+are\\s+you|what\\s+can\\s+you\\s+do|help)\\??$",
        Pattern.CASE_INSENSITIVE
    )

    private val FRUSTRATION_PATTERN = Pattern.compile(
        "^(wtf|what\\s+the\\s+(?:fuck|hell)|what\\??|huh\\??|are\\s+you\\s+(?:crazy|serious|dumb)|why\\s+did\\s+you\\s+do\\s+that)[!.,?\\s]*$",
        Pattern.CASE_INSENSITIVE
    )

    private val THANKS_PATTERN = Pattern.compile(
        "^(thanks|thank\\s+you|thx|cool|awesome|great|ok|okay)[!.,?\\s]*$",
        Pattern.CASE_INSENSITIVE
    )

    private val CLEAR_TASKS_PATTERN = Pattern.compile(
        "^(?:clear|delete|remove|wipe)\\s+(?:all\\s+)?(?:tasks|activities|schedule)$",
        Pattern.CASE_INSENSITIVE
    )

    private val DELETE_TASK_PATTERN = Pattern.compile(
        "^(?:delete|remove|cancel|drop)\\s+(?:task\\s+)?(.+?)$",
        Pattern.CASE_INSENSITIVE
    )

    fun parse(input: String): UserIntent? {
        val trimmed = input.trim()

        if (GREETING_PATTERN.matcher(trimmed).matches()) {
            return UserIntent.ConversationalChat("Hey! What's on your mind? Tell me what you'd like to plan, or ask 'What should I do now?'.")
        }

        if (HOW_ARE_YOU_PATTERN.matcher(trimmed).matches()) {
            return UserIntent.ConversationalChat("I'm running smoothly on-device! How can I help you manage your focus or plans today?")
        }

        if (WHO_ARE_YOU_PATTERN.matcher(trimmed).matches()) {
            return UserIntent.ConversationalChat("I am your personal AI operating assistant. You can tell me to schedule tasks ('Study DSA tonight for 2 hours'), reschedule ('I'm busy from 5 to 8'), check what to focus on ('What should I do now?'), or review your habits.")
        }

        if (FRUSTRATION_PATTERN.matcher(trimmed).matches()) {
            return UserIntent.ConversationalChat("Sorry about that! I won't schedule anything unless you ask. Tell me what you'd like to do, or ask 'What should I do now?'. You can also say 'clear tasks' to remove unintended tasks.")
        }

        if (THANKS_PATTERN.matcher(trimmed).matches()) {
            return UserIntent.ConversationalChat("Glad to help! Let me know whenever your plans change.")
        }

        if (CLEAR_TASKS_PATTERN.matcher(trimmed).matches()) {
            return UserIntent.ClearTasks
        }

        val delMatcher = DELETE_TASK_PATTERN.matcher(trimmed)
        if (delMatcher.matches()) {
            val name = delMatcher.group(1)?.trim() ?: ""
            if (name.isNotEmpty() && !name.equals("all", ignoreCase = true)) {
                return UserIntent.DeleteTask(taskQuery = name)
            }
        }

        if (WHAT_NOW_PATTERN.matcher(trimmed).matches()) {
            return UserIntent.WhatShouldIDoNow
        }

        if (QUERY_MEMORY_PATTERN.matcher(trimmed).matches()) {
            return UserIntent.QueryMemory
        }

        if (PRODUCTIVITY_PATTERN.matcher(trimmed).matches()) {
            return UserIntent.QueryProductivity
        }

        val moveMatcher = MOVE_TASK_PATTERN.matcher(trimmed)
        if (moveMatcher.matches()) {
            val taskName = moveMatcher.group(2)?.trim() ?: ""
            val target = moveMatcher.group(3)?.lowercase() ?: ""
            val offsetDays = if (target.contains("tomorrow")) 1 else 0
            val (hour, minute) = parseHourAndMinute(target)
            return UserIntent.RescheduleTask(
                taskQuery = taskName,
                targetDateOffsetDays = offsetDays,
                targetHour = hour,
                targetMinute = minute
            )
        }

        val completeMatcher = COMPLETE_TASK_PATTERN.matcher(trimmed)
        if (completeMatcher.matches()) {
            val taskName = completeMatcher.group(2)?.trim() ?: ""
            return UserIntent.CompleteTask(taskQuery = taskName)
        }

        val unavailMatcher = UNAVAILABLE_PATTERN.matcher(trimmed)
        if (unavailMatcher.matches()) {
            val fromStr = unavailMatcher.group(1) ?: "17:00"
            val toStr = unavailMatcher.group(2) ?: "20:00"
            val label = unavailMatcher.group(3)?.trim() ?: "Out with friends"
            val (startH, startM) = parseHourAndMinute(fromStr)
            val (endH, endM) = parseHourAndMinute(toStr)
            return UserIntent.SetUnavailable(
                startHour = startH ?: 17,
                startMinute = startM ?: 0,
                endHour = endH ?: 20,
                endMinute = endM ?: 0,
                label = label
            )
        }

        val explainMatcher = EXPLAIN_PATTERN.matcher(trimmed)
        if (explainMatcher.matches()) {
            val task1 = explainMatcher.group(1)
            val task2 = explainMatcher.group(2)
            val taskName = (task1 ?: task2)?.trim()
            return UserIntent.ExplainSchedule(taskQuery = taskName)
        }

        val prefMatcher = PREFERENCE_UPDATE_PATTERN.matcher(trimmed)
        if (prefMatcher.matches()) {
            val verb = prefMatcher.group(1)?.lowercase() ?: ""
            val detail = prefMatcher.group(2)?.trim() ?: ""
            return UserIntent.UpdatePreference(
                key = if (verb.contains("don't") || verb.contains("hate")) "disliked_routine" else "preferred_routine",
                value = detail,
                rawUserStatement = trimmed
            )
        }

        return null
    }

    private fun parseHourAndMinute(text: String): Pair<Int?, Int?> {
        val lower = text.lowercase().trim()
        val isPm = lower.contains("pm")
        val isAm = lower.contains("am")
        val digitsOnly = lower.replace("[^0-9:]".toRegex(), "")

        if (digitsOnly.isEmpty()) return null to null

        val parts = digitsOnly.split(":")
        var hour = parts[0].toIntOrNull() ?: return null to null
        val minute = if (parts.size > 1) parts[1].toIntOrNull() ?: 0 else 0

        if (isPm && hour < 12) hour += 12
        if (isAm && hour == 12) hour = 0
        if (!isPm && !isAm && hour in 1..7) hour += 12 // Default afternoon/evening bias for single digits 1-7

        return hour to minute
    }
}
