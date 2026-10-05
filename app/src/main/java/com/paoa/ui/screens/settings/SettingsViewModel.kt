package com.paoa.ui.screens.settings

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.paoa.core.ai.ApiKeyManager
import com.paoa.core.ai.GeminiClient
import com.paoa.core.device.DevicePermissionManager
import com.paoa.core.security.DataExportManager
import com.paoa.data.local.PAOADatabase
import com.paoa.data.repository.MemoryRepository
import com.paoa.domain.model.MemoryFact
import com.paoa.domain.model.ReminderMode
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SettingsViewModel(application: Application) : AndroidViewModel(application) {

    private val database = PAOADatabase.getInstance(application)
    private val memoryRepository = MemoryRepository(database)
    private val permissionManager = DevicePermissionManager(application)
    private val exportManager = DataExportManager(application, database)
    private val apiKeyManager = ApiKeyManager(application)

    data class SettingsUiState(
        val defaultReminderMode: ReminderMode = ReminderMode.ALARM,
        val speechRate: Float = 1.0f,
        val bufferMinutes: Int = 15,
        val memories: List<MemoryFact> = emptyList(),
        val permissions: List<DevicePermissionManager.PermissionItem> = emptyList(),
        val exportJsonString: String? = null,
        val messageBanner: String? = null,
        val geminiApiKey: String = "",
        val isTestingKey: Boolean = false,
        val keyTestSuccess: Boolean? = null
    )

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        loadSettings()
    }

    fun loadSettings() {
        viewModelScope.launch {
            val profile = memoryRepository.getProfile()
            val memories = memoryRepository.getActiveMemories()
            val perms = permissionManager.getPermissionsState()
            val savedKey = apiKeyManager.getGeminiApiKey() ?: ""

            val mode = runCatching { ReminderMode.valueOf(profile.defaultReminderMode) }
                .getOrDefault(ReminderMode.ALARM)

            _uiState.value = _uiState.value.copy(
                defaultReminderMode = mode,
                bufferMinutes = profile.defaultBufferMinutes,
                memories = memories,
                permissions = perms,
                geminiApiKey = savedKey,
                keyTestSuccess = if (savedKey.isNotBlank()) true else null
            )
        }
    }

    fun saveGeminiApiKey(key: String) {
        val trimmed = key.trim()
        apiKeyManager.setGeminiApiKey(trimmed)
        _uiState.value = _uiState.value.copy(
            geminiApiKey = trimmed,
            messageBanner = if (trimmed.isNotBlank()) "Gemini API Key saved. Conversational AI enabled!" else "API Key removed. Fallback to local rule engine.",
            keyTestSuccess = if (trimmed.isNotBlank()) true else null
        )
    }

    fun testGeminiApiKey(key: String) {
        val trimmed = key.trim()
        if (trimmed.isBlank()) {
            _uiState.value = _uiState.value.copy(messageBanner = "Please enter an API key first.", keyTestSuccess = false)
            return
        }

        _uiState.value = _uiState.value.copy(isTestingKey = true)
        viewModelScope.launch {
            val result = GeminiClient.testConnection(trimmed)
            if (result.isSuccess) {
                apiKeyManager.setGeminiApiKey(trimmed)
                _uiState.value = _uiState.value.copy(
                    isTestingKey = false,
                    keyTestSuccess = true,
                    geminiApiKey = trimmed,
                    messageBanner = "✓ Connection test successful! PAOA is now powered by Gemini 2.0 Flash."
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    isTestingKey = false,
                    keyTestSuccess = false,
                    messageBanner = "Connection test failed: ${result.exceptionOrNull()?.localizedMessage ?: "Invalid key or network error"}"
                )
            }
        }
    }

    fun setReminderMode(mode: ReminderMode) {
        viewModelScope.launch {
            val profile = memoryRepository.getProfile().copy(defaultReminderMode = mode.name)
            memoryRepository.saveProfile(profile)
            _uiState.value = _uiState.value.copy(defaultReminderMode = mode)
        }
    }

    fun deactivateMemory(id: Long) {
        viewModelScope.launch {
            memoryRepository.deactivateMemory(id)
            loadSettings()
            _uiState.value = _uiState.value.copy(messageBanner = "Preference corrected and removed from Digital Twin.")
        }
    }

    fun exportData() {
        viewModelScope.launch {
            val json = exportManager.exportDataAsJson()
            _uiState.value = _uiState.value.copy(
                exportJsonString = json,
                messageBanner = "Data successfully exported as JSON."
            )
        }
    }

    fun purgeAllData() {
        viewModelScope.launch {
            exportManager.purgeAllData()
            loadSettings()
            _uiState.value = _uiState.value.copy(messageBanner = "All personal local data completely wiped.")
        }
    }

    fun openAppSettings() {
        permissionManager.openAppSettings()
    }

    fun openExactAlarmSettings() {
        permissionManager.openExactAlarmSettings()
    }

    fun clearBanner() {
        _uiState.value = _uiState.value.copy(messageBanner = null)
    }
}
