package com.paoa.core.ai

import com.paoa.domain.model.UserIntent

object IntentRouter {

    fun route(input: String): UserIntent {
        val trimmed = input.trim()
        if (trimmed.isEmpty()) return UserIntent.Unknown("")

        // 1. Try Layer 1 Deterministic
        val deterministicResult = DeterministicCommandEngine.parse(trimmed)
        if (deterministicResult != null) {
            return deterministicResult
        }

        // 2. Try Layer 2 Lightweight NLP
        // If input contains task intention markers
        val lower = trimmed.lowercase()
        val isExplicitTaskPrefix = lower.startsWith("i need to ") ||
                lower.startsWith("i have to ") ||
                lower.startsWith("i want to ") ||
                lower.startsWith("i will ") ||
                lower.startsWith("please schedule ") ||
                lower.startsWith("schedule ") ||
                lower.startsWith("plan ") ||
                lower.startsWith("add task ")

        val isActionKeyword = lower.startsWith("study ") ||
                lower.startsWith("work on ") ||
                lower.startsWith("prepare for ") ||
                lower.startsWith("finish ") ||
                lower.startsWith("code ") ||
                lower.startsWith("workout ") ||
                lower.startsWith("exercise ") ||
                lower.startsWith("gym ") ||
                lower.startsWith("run ") ||
                lower.startsWith("read ")

        val hasDurationOrTimeWithTaskContext = (lower.contains("assignment") || lower.contains("exam") || lower.contains("homework")) &&
                (lower.contains("tomorrow") || lower.contains("tonight") || lower.contains("hour") || lower.contains("min") || lower.contains("due"))

        val isTaskIntention = isExplicitTaskPrefix || isActionKeyword || hasDurationOrTimeWithTaskContext

        if (isTaskIntention) {
            return LightweightNlpParser.parseTaskCreation(trimmed)
        }

        if (trimmed.endsWith("?")) {
            return UserIntent.ConversationalChat("I'm here to help you manage your day and focus. Ask 'What should I do now?' or tell me what to schedule (e.g. 'Study DSA for 2 hours tonight').")
        }

        return UserIntent.Unknown(trimmed)
    }
}
