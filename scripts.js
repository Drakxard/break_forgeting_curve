document.addEventListener('DOMContentLoaded', () => {
    const todoForm = document.getElementById('todo-form');
    const taskInput = document.getElementById('task-input');
    const todoList = document.getElementById('todo-list');
    const calendarEl = document.getElementById('calendar');
    const ctx = document.getElementById('progress-chart').getContext('2d');

    // Initialize chart
    const progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], // Dates for the x-axis
            datasets: [{
                label: 'Retention (%)',
                data: [], // Retention data
                backgroundColor: '#0044cc',
                borderColor: '#003399',
                borderWidth: 2,
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Retention (%)'
                    },
                    min: 0,
                    max: 100
                }
            }
        }
    });

    // Initialize calendar
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        editable: true,
        events: [] // Events will be added dynamically
    });
    calendar.render();

    // Spaced Repetition Data Storage
    const taskData = {}; // Store task info and review dates

    // Load tasks from persistent storage
    fetch('/tasks')
        .then(response => response.json())
        .then(savedTasks => {
            savedTasks.forEach(info => {
                const li = document.createElement('li');
                li.textContent = info.task;
                todoList.appendChild(li);

                taskData[info.task] = {
                    lastReviewed: new Date(info.lastReviewed),
                    interval: info.interval,
                    retention: info.retention
                };

                progressChart.data.labels.push(formatDate(new Date(info.lastReviewed)));
                progressChart.data.datasets[0].data.push(info.retention);

                calendar.addEvent({
                    title: info.task,
                    start: new Date(info.lastReviewed).toISOString().split('T')[0],
                    allDay: true
                });
            });
            progressChart.update();
        })
        .catch(err => console.error('Error loading tasks:', err));

    // Add a new task
    todoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const task = taskInput.value;
        if (task) {
            const li = document.createElement('li');
            li.textContent = task;
            todoList.appendChild(li);

            // Initialize task data
            taskData[task] = {
                lastReviewed: new Date(),
                interval: 2, // Start with a 2-day interval
                retention: 10 // Initial retention at 10%
            };

            // Update chart (Initial entry)
            progressChart.data.labels.push(formatDate(new Date()));
            progressChart.data.datasets[0].data.push(10); // Start with 10% retention
            progressChart.update();

            // Add event to calendar
            calendar.addEvent({
                title: task,
                start: new Date().toISOString().split('T')[0], // Set event start date to today
                allDay: true
            });

            taskInput.value = '';
            saveTasksToServer();
        }
    });

    // Function to format date as YYYY-MM-DD
    function formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    function saveTasksToServer() {
        const tasks = Object.keys(taskData).map(task => ({
            task: task,
            lastReviewed: taskData[task].lastReviewed,
            interval: taskData[task].interval,
            retention: taskData[task].retention
        }));

        fetch('/tasks', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tasks)
        }).catch(err => console.error('Error saving tasks:', err));
    }

    // Function to update retention and set next review
    function addRepetitionTask(task) {
        const now = new Date();
        const taskInfo = taskData[task];

        // Update retention based on days since last review
        const daysSinceLastReview = Math.floor((now - new Date(taskInfo.lastReviewed)) / (1000 * 60 * 60 * 24));
        const newRetention = Math.max(taskInfo.retention - (daysSinceLastReview * 10), 0); // Decrease retention by 10% per day
        taskInfo.retention = newRetention;

        // Calculate next review date
        const nextReviewDate = new Date(taskInfo.lastReviewed);
        nextReviewDate.setDate(nextReviewDate.getDate() + taskInfo.interval);
        taskInfo.lastReviewed = now;
        taskInfo.interval *= 2; // Double the interval for the next review

        // Add review event to calendar
        calendar.addEvent({
            title: `Review: ${task}`,
            start: formatDate(nextReviewDate),
            allDay: true
        });

        // Update chart with retention after review
        progressChart.data.labels.push(formatDate(now));
        taskInfo.retention = 90; // Reset retention to 90% after review
        progressChart.data.datasets[0].data.push(taskInfo.retention);
        progressChart.update();
        saveTasksToServer();
    }

    // Example of adding repetition for demo purpose
    todoList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            addRepetitionTask(e.target.textContent);
        }
    });

    // Periodic retention decrease and date update simulation
    setInterval(() => {
        const now = new Date();
        let chartUpdated = false;

        Object.keys(taskData).forEach(task => {
            const taskInfo = taskData[task];
            const daysSinceLastReview = Math.floor((now - new Date(taskInfo.lastReviewed)) / (1000 * 60 * 60 * 24));

            // Decrease retention if not reviewed
            if (daysSinceLastReview > 0) {
                taskInfo.retention = Math.max(taskInfo.retention - (daysSinceLastReview * 10), 0);
                progressChart.data.labels.push(formatDate(now));
                progressChart.data.datasets[0].data.push(taskInfo.retention);
                chartUpdated = true;
            }
        });

        if (chartUpdated) {
            progressChart.update();
            saveTasksToServer();
        }
    }, 10000); // Update retention and date every 10 seconds for demo purposes
});
