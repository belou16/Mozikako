import { randomUUID } from 'crypto';

const jobs = new Map();

export function createJob(type, payload) {
  const jobId = `job_${type}_${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const job = {
    jobId,
    type,
    status: 'queued',
    progress: 0,
    createdAt: now,
    updatedAt: now,
    payload,
  };

  jobs.set(jobId, job);
  simulateJobProgress(jobId);
  return job;
}

export function getJob(jobId) {
  return jobs.get(jobId) || null;
}

function simulateJobProgress(jobId) {
  const ticks = [20, 45, 75, 100];
  ticks.forEach((value, index) => {
    setTimeout(() => {
      const job = jobs.get(jobId);
      if (!job) return;
      job.progress = value;
      job.status = value === 100 ? 'completed' : 'running';
      job.updatedAt = new Date().toISOString();
      jobs.set(jobId, job);
    }, (index + 1) * 900);
  });
}
