// Build a dependency-free CommonJS timer module for tracking named tasks.
// PM → Dev. 2026-10-14T10:41:41.467Z

// Usage: const Timer = require('./task-timer'); const timer = new Timer(); timer.start('build');
'use strict';

class TaskTimer {
  constructor(clock) {
    if (clock !== undefined && typeof clock !== 'function') {
      throw new TypeError('clock must be a function');
    }

    this._clock = clock || Date.now;
    this._tasks = new Map();
  }

  start(name) {
    const taskName = this._normalizeName(name);
    const timestamp = this._now();
    let task = this._tasks.get(taskName);

    if (task && task.running) {
      throw new Error('Task is already running: ' + taskName);
    }

    if (!task) {
      task = {
        name: taskName,
        accumulated: 0,
        startedAt: null,
        running: false
      };
      this._tasks.set(taskName, task);
    }

    task.startedAt = timestamp;
    task.running = true;

    return this._details(task, timestamp);
  }

  stop(name) {
    const task = this._getTask(name);
    const timestamp = this._now();

    if (!task.running) {
      throw new Error('Task is not running: ' + task.name);
    }

    task.accumulated += Math.max(0, timestamp - task.startedAt);
    task.startedAt = null;
    task.running = false;

    return this._details(task, timestamp);
  }

  elapsed(name) {
    const task = this._getTask(name);
    return this._elapsed(task, this._now());
  }

  status(name) {
    const task = this._getTask(name);
    return this._details(task, this._now());
  }

  reset(name) {
    const taskName = this._normalizeName(name);
    const task = this._tasks.get(taskName);

    if (!task) {
      throw new Error('Unknown task: ' + taskName);
    }

    const details = this._details(task, this._now());
    this._tasks.delete(taskName);

    return details;
  }

  summary() {
    const timestamp = this._now();

    return Array.from(this._tasks.values(), (task) => this._details(task, timestamp));
  }

  _normalizeName(name) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new TypeError('Task name must be a non-empty string');
    }

    return name.trim();
  }

  _getTask(name) {
    const taskName = this._normalizeName(name);
    const task = this._tasks.get(taskName);

    if (!task) {
      throw new Error('Unknown task: ' + taskName);
    }

    return task;
  }

  _now() {
    const timestamp = this._clock();

    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
      throw new TypeError('clock must return a finite millisecond timestamp');
    }

    return timestamp;
  }

  _elapsed(task, timestamp) {
    if (!task.running) {
      return task.accumulated;
    }

    return task.accumulated + Math.max(0, timestamp - task.startedAt);
  }

  _details(task, timestamp) {
    const elapsed = this._elapsed(task, timestamp);

    return {
      name: task.name,
      elapsed: elapsed,
      accumulatedElapsed: elapsed,
      running: task.running,
      startedAt: task.running ? task.startedAt : null
    };
  }
}

function createTaskTimer(clock) {
  return new TaskTimer(clock);
}

module.exports = TaskTimer;
module.exports.TaskTimer = TaskTimer;
module.exports.createTaskTimer = createTaskTimer;

if (require.main === module) {
  let now = 1000;
  const timer = new TaskTimer(() => now);

  timer.start('test');
  now += 250;
  if (timer.elapsed('test') !== 250) throw new Error('elapsed self-test failed');
  if (timer.stop('test').elapsed !== 250) throw new Error('stop self-test failed');
  if (timer.summary().length !== 1) throw new Error('summary self-test failed');
}
