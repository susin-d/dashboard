import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('Workspace API Data Transformers', () => {
  it('formats project IDs correctly', () => {
    const cleanProjectId = (id) => String(id).replace(/^project-/, '')
    assert.equal(cleanProjectId('project-abc12345'), 'abc12345')
    assert.equal(cleanProjectId('rawId999'), 'rawId999')
  })

  it('maps job payload fields correctly', () => {
    const mapJob = (job) => ({
      id: job.id,
      company: job.company,
      role: job.role,
      status: job.status,
      workType: job.work_type,
    })

    const apiJob = {
      id: 'job-1',
      company: 'Google',
      role: 'Software Engineer',
      status: 'Interview',
      work_type: 'Full-time',
    }

    const mapped = mapJob(apiJob)
    assert.equal(mapped.id, 'job-1')
    assert.equal(mapped.company, 'Google')
    assert.equal(mapped.workType, 'Full-time')
  })
})
