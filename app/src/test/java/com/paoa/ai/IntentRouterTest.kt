package com.paoa.ai

import com.paoa.core.ai.IntentRouter
import com.paoa.domain.model.UserIntent
import org.junit.Assert.*
import org.junit.Test

class IntentRouterTest {

    @Test
    fun testGreetingsDoNotCreateTasks() {
        val hi = IntentRouter.route("hi")
        assertTrue("Expected ConversationalChat for 'hi' but got $hi", hi is UserIntent.ConversationalChat)

        val hello = IntentRouter.route("hello 🤗")
        assertTrue("Expected ConversationalChat for 'hello 🤗' but got $hello", hello is UserIntent.ConversationalChat)

        val hey = IntentRouter.route("hey there")
        assertTrue("Expected ConversationalChat for 'hey there' but got $hey", hey is UserIntent.ConversationalChat)
    }

    @Test
    fun testFrustrationDoesNotCreateTasks() {
        val wtf = IntentRouter.route("wtf")
        assertTrue("Expected ConversationalChat for 'wtf' but got $wtf", wtf is UserIntent.ConversationalChat)

        val whatTheHell = IntentRouter.route("what the hell")
        assertTrue("Expected ConversationalChat for 'what the hell' but got $whatTheHell", whatTheHell is UserIntent.ConversationalChat)
    }

    @Test
    fun testCasualQuestionsDoNotCreateTasks() {
        val howAreYou = IntentRouter.route("how are you?")
        assertTrue(howAreYou is UserIntent.ConversationalChat)

        val whoAreYou = IntentRouter.route("who are you")
        assertTrue(whoAreYou is UserIntent.ConversationalChat)
    }

    @Test
    fun testTaskDeletionIntents() {
        val del = IntentRouter.route("delete task DSA")
        assertTrue(del is UserIntent.DeleteTask)
        assertEquals("DSA", (del as UserIntent.DeleteTask).taskQuery)

        val clear = IntentRouter.route("clear all tasks")
        assertTrue(clear is UserIntent.ClearTasks)
    }

    @Test
    fun testExplicitTaskCreationIntents() {
        val study = IntentRouter.route("I need to study DSA")
        assertTrue(study is UserIntent.ScheduleTask)

        val run = IntentRouter.route("I want to run tomorrow morning")
        assertTrue(run is UserIntent.ScheduleTask)

        val finish = IntentRouter.route("finish DBMS assignment tonight")
        assertTrue(finish is UserIntent.ScheduleTask)
    }

    @Test
    fun testUnknownRandomPhrasesDoNotCreateTasks() {
        val random = IntentRouter.route("banana apple orange")
        assertTrue("Expected Unknown for random words but got $random", random is UserIntent.Unknown)
    }
}
