package com.paoa.core.ai

import com.paoa.domain.model.Priority
import com.paoa.domain.model.TaskCategory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.regex.Pattern

object GeminiClient {

    private const val MODEL_PRIMARY = "gemini-2.0-flash"
    private const val MODEL_FALLBACK = "gemini-1.5-flash"

    sealed interface AiAction {
        data class ScheduleTask(
            val title: String,
            val durationMinutes: Int = 45,
            val targetDateOffsetDays: Int = 0,
            val targetHour: Int? = null,
            val targetMinute: Int? = null,
            val category: TaskCategory = TaskCategory.PERSONAL,
            val priority: Priority = Priority.NORMAL
        ) : AiAction

        data class RescheduleTask(
            val taskQuery: String,
            val targetDateOffsetDays: Int = 1,
            val targetHour: Int? = null,
            val targetMinute: Int? = null
        ) : AiAction

        data class DeleteTask(val taskQuery: String) : AiAction
        data object ClearAllTasks : AiAction
        data class CompleteTask(val taskQuery: String) : AiAction
        data class SetUnavailable(
            val startHour: Int,
            val startMinute: Int,
            val endHour: Int,
            val endMinute: Int,
            val label: String
        ) : AiAction
        data class UpdatePreference(val key: String, val value: String) : AiAction
    }

    data class GeminiResponse(
        val replyText: String,
        val actions: List<AiAction> = emptyList()
    )

    private val ACTIONS_BLOCK_PATTERN = Pattern.compile("<actions>(.*?)</actions>", Pattern.DOTALL or Pattern.CASE_INSENSITIVE)

    suspend fun generateResponse(
        apiKey: String,
        conversationHistory: List<Pair<String, String>>, // role ("user" / "model") to text
        systemInstruction: String
    ): Result<GeminiResponse> = withContext(Dispatchers.IO) {
        runCatching {
            // First try gemini-2.0-flash, fallback to gemini-1.5-flash if needed
            try {
                executeRequest(apiKey, MODEL_PRIMARY, conversationHistory, systemInstruction)
            } catch (e: Exception) {
                if (e.message?.contains("404") == true || e.message?.contains("not found") == true) {
                    executeRequest(apiKey, MODEL_FALLBACK, conversationHistory, systemInstruction)
                } else {
                    throw e
                }
            }
        }
    }

    suspend fun testConnection(apiKey: String): Result<String> = withContext(Dispatchers.IO) {
        runCatching {
            val response = executeRequest(
                apiKey = apiKey,
                model = MODEL_PRIMARY,
                conversationHistory = listOf("user" to "Hello! Reply with 'OK' only."),
                systemInstruction = "You are a test connection assistant. Reply with 'OK' only."
            )
            response.replyText.trim()
        }
    }

    private fun executeRequest(
        apiKey: String,
        model: String,
        conversationHistory: List<Pair<String, String>>,
        systemInstruction: String
    ): GeminiResponse {
        val endpoint = "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey"
        val url = URL(endpoint)
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            setRequestProperty("Content-Type", "application/json; charset=utf-8")
            connectTimeout = 15000
            readTimeout = 25000
            doOutput = true
            doInput = true
        }

        val requestBody = buildJsonPayload(conversationHistory, systemInstruction)

        OutputStreamWriter(connection.outputStream, "UTF-8").use { writer ->
            writer.write(requestBody)
            writer.flush()
        }

        val responseCode = connection.responseCode
        if (responseCode !in 200..299) {
            val errStream = connection.errorStream ?: connection.inputStream
            val errText = BufferedReader(InputStreamReader(errStream, "UTF-8")).use { it.readText() }
            throw IllegalStateException("Gemini API error ($responseCode): $errText")
        }

        val responseText = BufferedReader(InputStreamReader(connection.inputStream, "UTF-8")).use { it.readText() }
        return parseGeminiResponse(responseText)
    }

    private fun buildJsonPayload(
        conversationHistory: List<Pair<String, String>>,
        systemInstruction: String
    ): String {
        val root = JSONObject()

        // System Instruction
        val systemObj = JSONObject().apply {
            val partsArr = JSONArray().apply {
                put(JSONObject().put("text", systemInstruction))
            }
            put("parts", partsArr)
        }
        root.put("systemInstruction", systemObj)

        // Contents (Multi-turn)
        val contentsArr = JSONArray()
        // Take up to the last 12 messages for relevant context without token bloat
        val recentHistory = conversationHistory.takeLast(12)
        for ((role, text) in recentHistory) {
            val geminiRole = if (role.equals("assistant", ignoreCase = true) || role.equals("model", ignoreCase = true)) "model" else "user"
            val messageObj = JSONObject().apply {
                put("role", geminiRole)
                val parts = JSONArray().apply {
                    put(JSONObject().put("text", text))
                }
                put("parts", parts)
            }
            contentsArr.put(messageObj)
        }
        root.put("contents", contentsArr)

        // Generation Config
        val genConfig = JSONObject().apply {
            put("temperature", 0.7)
            put("maxOutputTokens", 1024)
        }
        root.put("generationConfig", genConfig)

        return root.toString()
    }

    private fun parseGeminiResponse(rawJson: String): GeminiResponse {
        val root = JSONObject(rawJson)
        val candidates = root.optJSONArray("candidates") ?: return GeminiResponse("I couldn't process that.")
        if (candidates.length() == 0) return GeminiResponse("No response received.")

        val firstCandidate = candidates.getJSONObject(0)
        val content = firstCandidate.optJSONObject("content") ?: return GeminiResponse("No content received.")
        val parts = content.optJSONArray("parts") ?: return GeminiResponse("Empty response.")

        val fullTextBuilder = StringBuilder()
        for (i in 0 until parts.length()) {
            val part = parts.getJSONObject(i)
            fullTextBuilder.append(part.optString("text", ""))
        }
        val fullText = fullTextBuilder.toString()

        // Extract actions block if present
        val actions = mutableListOf<AiAction>()
        var cleanReply = fullText

        val matcher = ACTIONS_BLOCK_PATTERN.matcher(fullText)
        if (matcher.find()) {
            val rawActionsJson = matcher.group(1)?.trim() ?: ""
            cleanReply = fullText.replace(matcher.group(0) ?: "", "").trim()

            if (rawActionsJson.isNotEmpty()) {
                try {
                    val jsonArray = JSONArray(rawActionsJson)
                    for (i in 0 until jsonArray.length()) {
                        val actionObj = jsonArray.getJSONObject(i)
                        val type = actionObj.optString("type", "").uppercase()
                        when (type) {
                            "SCHEDULE_TASK" -> {
                                val catStr = actionObj.optString("category", "PERSONAL").uppercase()
                                val prioStr = actionObj.optString("priority", "NORMAL").uppercase()
                                val category = runCatching { TaskCategory.valueOf(catStr) }.getOrDefault(TaskCategory.PERSONAL)
                                val priority = runCatching { Priority.valueOf(prioStr) }.getOrDefault(Priority.NORMAL)

                                actions.add(
                                    AiAction.ScheduleTask(
                                        title = actionObj.optString("title", "New Task"),
                                        durationMinutes = actionObj.optInt("durationMinutes", 45),
                                        targetDateOffsetDays = actionObj.optInt("targetDateOffsetDays", 0),
                                        targetHour = if (actionObj.has("startHour")) actionObj.getInt("startHour") else null,
                                        targetMinute = if (actionObj.has("startMinute")) actionObj.getInt("startMinute") else null,
                                        category = category,
                                        priority = priority
                                    )
                                )
                            }
                            "RESCHEDULE_TASK" -> {
                                actions.add(
                                    AiAction.RescheduleTask(
                                        taskQuery = actionObj.optString("taskQuery", ""),
                                        targetDateOffsetDays = actionObj.optInt("targetDateOffsetDays", 1),
                                        targetHour = if (actionObj.has("targetHour")) actionObj.getInt("targetHour") else null,
                                        targetMinute = if (actionObj.has("targetMinute")) actionObj.getInt("targetMinute") else null
                                    )
                                )
                            }
                            "DELETE_TASK" -> {
                                actions.add(AiAction.DeleteTask(taskQuery = actionObj.optString("taskQuery", "")))
                            }
                            "CLEAR_ALL_TASKS" -> {
                                actions.add(AiAction.ClearAllTasks)
                            }
                            "COMPLETE_TASK" -> {
                                actions.add(AiAction.CompleteTask(taskQuery = actionObj.optString("taskQuery", "")))
                            }
                            "SET_UNAVAILABLE" -> {
                                actions.add(
                                    AiAction.SetUnavailable(
                                        startHour = actionObj.optInt("startHour", 17),
                                        startMinute = actionObj.optInt("startMinute", 0),
                                        endHour = actionObj.optInt("endHour", 20),
                                        endMinute = actionObj.optInt("endMinute", 0),
                                        label = actionObj.optString("label", "Unavailable")
                                    )
                                )
                            }
                            "UPDATE_PREFERENCE" -> {
                                actions.add(
                                    AiAction.UpdatePreference(
                                        key = actionObj.optString("key", "preference"),
                                        value = actionObj.optString("value", "")
                                    )
                                )
                            }
                        }
                    }
                } catch (_: Exception) {
                    // Ignore JSON parsing failure in actions block
                }
            }
        }

        return GeminiResponse(replyText = cleanReply, actions = actions)
    }
}
