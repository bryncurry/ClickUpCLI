#!/usr/bin/env node

import { Command } from "commander";
import { ClickUpClient } from "./api.js";
import dotenv from "dotenv";

dotenv.config();

const program = new Command();
const client = new ClickUpClient();

program
    .name("clk")
    .description("ClickUp helper CLI")
    .version("0.0.1");

program.command("status")
    .description("Show current running timer")
    .action(async () => {
        try {
            const running = await client.getRunningTimer();
            if (running) {
                console.log(`Currently tracking: [${running.task.name}] (${running.task.url})`);
                if (running.start) {
                    const duration = Date.now() - parseInt(running.start);
                    const minutes = Math.floor(duration / 60000);
                    console.log(`Duration: ${minutes} minutes`);
                }
            } else {
                console.log("No active timer found.");
            }
        } catch (error: any) {
            console.error("Error:", error.message);
        }
    });

program.command("meetings")
    .description("Switch timer to 'Meetings' task")
    .action(async () => {
        try {
            console.log("Searching for 'Meetings'...");
            const tasks = await client.searchTasks("Meetings");
            if (tasks.length === 0) {
                console.error("No task named 'Meetings' found.");
                return;
            }

            // Look for exact match first, then partial
            const meetingTask = tasks.find(t => t.name.toLowerCase() === "meetings") || tasks[0];

            console.log(`Found: ${meetingTask.name} (${meetingTask.id})`);
            // Removing description to avoid "Advanced Time Tracking" limits on free plans
            await client.startTimer(meetingTask.id);
            console.log(`Timer started for ${meetingTask.name}`);
        } catch (error: any) {
            console.error("Error:", error.message);
        }
    });

program.command("tasks")
    .description("List tasks assigned to me")
    .action(async () => {
        try {
            const tasks = await client.getAssignedTasks();
            if (tasks.length === 0) {
                console.log("No assigned tasks found.");
                return;
            }
            console.log("Assigned Tasks:");
            tasks.forEach(t => {
                console.log(`${t.id} - ${t.name} [${t.status.status.toUpperCase()}]`);
            });
        } catch (error: any) {
            console.error("Error:", error.message);
        }
    });

program.command("switch <query>")
    .description("Switch to a task by ID.")
    .action(async (query: string) => {
        try {

            const tasks = await client.searchTasks(query);

            // Filter? Or just take first.
            let targetTask = null;

            // Exact ID check from search results, or exact name match
            if (tasks.length > 0) {
                // Prefer exact ID match
                const idMatch = tasks.find(t => t.id === query);
                if (idMatch) {
                    targetTask = idMatch;
                }
            }

            if (targetTask) {
                console.log(`Found: ${targetTask.name} (${targetTask.id})`);
                await client.startTimer(targetTask.id);
                console.log(`Timer started for ${targetTask.name}`);
            } else {
                console.error(`No task found for '${query}'`);
            }
        } catch (error: any) {
            console.error("Error:", error.message);
        }
    });

program.command("back")
    .description("Switch to the previous task (most recent time entry before current)")
    .action(async () => {
        try {
            const entries = await client.getRecentTimeEntries();
            const current = await client.getRunningTimer();

            // Find the most recent entry that is different from the current task
            // entries are usually ordered by start time desc.
            // If current is running, it might be the top one or separate from history depending on API.

            const currentTaskId = current?.task.id;

            const previousEntry = entries.find(e => e.task.id !== currentTaskId);

            if (previousEntry) {
                const t = previousEntry.task;
                console.log(`Switching back to: ${t.name} (${t.id})`);
                await client.startTimer(t.id);
                console.log(`Timer started.`);
            } else {
                console.log("No previous different task found in recent history.");
            }
        } catch (error: any) {
            console.error("Error:", error.message);
        }
    });

program.command("stop")
    .description("Stop the current timer")
    .action(async () => {
        try {
            await client.stopTimer();
            console.log("Timer stopped.");
        } catch (error: any) {
            console.error("Error:", error.message);
        }
    });

program.parse(process.argv);
