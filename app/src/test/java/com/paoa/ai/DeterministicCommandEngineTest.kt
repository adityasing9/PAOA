package com.paoa.ai

import com.paoa.core.ai.DeterministicCommandEngine
import com.paoa.domain.model.UserIntent
import org.junit.Assert.*
import org.junit.Test

class DeterministicCommandEngineTest {

    @Test
    fun testWhatShouldIDoNow() {
        val result1 = DeterministicCommandEngine.parse("What should I do now?")
        assertTrue(result1 is UserIntent.WhatShouldIDoNow)

        val result2 = DeterministicCommandEngine.parse("what's next")
        assertTrue(result2 is UserIntent.WhatShouldIDoNow)

        val result3 = DeterministicCommandEngine.parse("next task")
        assertTrue(result3 is UserIntent.WhatShouldIDoNow)
    }

    @Test
    fun testMoveTaskCommand() {
        val result = DeterministicCommandEngine.parse("Move DSA to tomorrow")
        assertNotNull(result)
        assertTrue(result is UserIntent.RescheduleTask)
        val reschedule = result as UserIntent.RescheduleTask
        assertEquals("DSA", reschedule.taskQuery)
        assertEquals(1, reschedule.targetDateOffsetDays)
    }

    @Test
    fun testCompleteTaskCommand() {
        val result = DeterministicCommandEngine.parse("Mark DBMS complete")
        assertNotNull(result)
        assertTrue(result is UserIntent.CompleteTask)
        val complete = result as UserIntent.CompleteTask
        assertEquals("DBMS", complete.taskQuery)
    }

    @Test
    fun testUnavailableBlockCommand() {
        val result = DeterministicCommandEngine.parse("I'm going out with friends from 5 PM to 8 PM")
        assertNotNull(result)
        assertTrue(result is UserIntent.SetUnavailable)
        val unavail = result as UserIntent.SetUnavailable
        assertEquals(17, unavail.startHour)
        assertEquals(20, unavail.endHour)
    }

    @Test
    fun testExplainCommand() {
        val result = DeterministicCommandEngine.parse("Why did you schedule DSA now?")
        assertNotNull(result)
        assertTrue(result is UserIntent.ExplainSchedule)
        val explain = result as UserIntent.ExplainSchedule
        assertEquals("DSA", explain.taskQuery)
    }

    @Test
    fun testQueryMemoryCommand() {
        val result = DeterministicCommandEngine.parse("What do you know about me?")
        assertTrue(result is UserIntent.QueryMemory)
    }

    @Test
    fun testUpdatePreferenceCommand() {
        val result = DeterministicCommandEngine.parse("I don't like studying in the morning anymore")
        assertNotNull(result)
        assertTrue(result is UserIntent.UpdatePreference)
        val pref = result as UserIntent.UpdatePreference
        assertEquals("disliked_routine", pref.key)
    }

    @Test
    fun testConversationalGreetings() {
        val hi = DeterministicCommandEngine.parse("hi")
        assertTrue(hi is UserIntent.ConversationalChat)

        val hello = DeterministicCommandEngine.parse("hello 🤗")
        assertTrue(hello is UserIntent.ConversationalChat)

        val hey = DeterministicCommandEngine.parse("hey there")
        assertTrue(hey is UserIntent.ConversationalChat)
    }

    @Test
    fun testFrustrationAndCasualResponses() {
        val wtf = DeterministicCommandEngine.parse("wtf")
        assertTrue(wtf is UserIntent.ConversationalChat)

        val howAreYou = DeterministicCommandEngine.parse("how are you?")
        assertTrue(howAreYou is UserIntent.ConversationalChat)

        val whoAreYou = DeterministicCommandEngine.parse("who are you")
        assertTrue(whoAreYou is UserIntent.ConversationalChat)
    }

    @Test
    fun testDeleteTaskCommand() {
        val del = DeterministicCommandEngine.parse("delete task DSA")
        assertTrue(del is UserIntent.DeleteTask)
        assertEquals("DSA", (del as UserIntent.DeleteTask).taskQuery)

        val cancel = DeterministicCommandEngine.parse("cancel task DBMS")
        assertTrue(cancel is UserIntent.DeleteTask)
        assertEquals("DBMS", (cancel as UserIntent.DeleteTask).taskQuery)
    }

    @Test
    fun testClearTasksCommand() {
        val clear = DeterministicCommandEngine.parse("clear all tasks")
        assertTrue(clear is UserIntent.ClearTasks)

        val clear2 = DeterministicCommandEngine.parse("delete all tasks")
        assertTrue(clear2 is UserIntent.ClearTasks)
    }
}
