const { pool } = require("./database");


// ==========================================
// ADD VIDEO TO HISTORY
// ==========================================

async function addVideoToHistory(video) {

  const result = await pool.query(
    `
    INSERT INTO video_history (
      project_id,
      job_id,
      title,
      video_path,
      status
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [
      video.projectId || null,
      video.id || null,
      video.title ||
        video.prompt ||
        "Untitled Video",
      video.finalVideoPath || null,
      video.status || "queued"
    ]
  );


  return result.rows[0];
}


// ==========================================
// UPDATE VIDEO HISTORY
// ==========================================

async function updateVideoHistory(video) {

  if (!video.id) {
    return null;
  }


  const result = await pool.query(
    `
    UPDATE video_history
    SET
      title = $1,
      video_path = $2,
      status = $3
    WHERE job_id = $4
    RETURNING *
    `,
    [
      video.title ||
        video.prompt ||
        "Untitled Video",

      video.finalVideoPath ||
        null,

      video.status ||
        "queued",

      video.id
    ]
  );


  if (result.rows.length === 0) {
    return addVideoToHistory(video);
  }


  return result.rows[0];
}


// ==========================================
// GET VIDEO HISTORY
// ==========================================

async function getVideoHistory() {

  const result = await pool.query(
    `
    SELECT
      h.id,
      h.project_id,
      h.job_id,
      h.title,
      h.video_path,
      h.status,
      h.created_at,

      p.prompt,
      p.duration,
      p.aspect_ratio,
      p.style

    FROM video_history h

    LEFT JOIN video_projects p
      ON p.id = h.project_id

    ORDER BY h.created_at DESC
    `
  );


  return result.rows.map(
    (row) => ({

      id:
        String(row.job_id),

      historyId:
        String(row.id),

      projectId:
        row.project_id
          ? String(row.project_id)
          : null,

      title:
        row.title,

      prompt:
        row.prompt || row.title,

      duration:
        row.duration,

      aspectRatio:
        row.aspect_ratio,

      style:
        row.style,

      videoPath:
        row.video_path,

      status:
        row.status,

      createdAt:
        row.created_at

    })
  );
}


// ==========================================
// GET ONE HISTORY ITEM
// ==========================================

async function getHistoryItem(
  jobId
) {

  const result = await pool.query(
    `
    SELECT
      h.id,
      h.project_id,
      h.job_id,
      h.title,
      h.video_path,
      h.status,
      h.created_at,

      p.prompt,
      p.duration,
      p.aspect_ratio,
      p.style

    FROM video_history h

    LEFT JOIN video_projects p
      ON p.id = h.project_id

    WHERE h.job_id = $1
    `,
    [jobId]
  );


  if (result.rows.length === 0) {
    return null;
  }


  const row =
    result.rows[0];


  return {

    id:
      String(row.job_id),

    historyId:
      String(row.id),

    projectId:
      row.project_id
        ? String(row.project_id)
        : null,

    title:
      row.title,

    prompt:
      row.prompt || row.title,

    duration:
      row.duration,

    aspectRatio:
      row.aspect_ratio,

    style:
      row.style,

    videoPath:
      row.video_path,

    status:
      row.status,

    createdAt:
      row.created_at

  };
}


// ==========================================
// EXPORTS
// ==========================================

module.exports = {

  addVideoToHistory,

  updateVideoHistory,

  getVideoHistory,

  getHistoryItem

};