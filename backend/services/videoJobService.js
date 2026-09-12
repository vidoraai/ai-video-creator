const { pool } = require("./database");


// ==========================================
// CREATE VIDEO JOB
// ==========================================

async function createJob(data) {

  // Create the video project
  const projectResult = await pool.query(
    `
    INSERT INTO video_projects (
      title,
      prompt,
      duration,
      aspect_ratio,
      style,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [
      data.title || "Untitled Video",
      data.prompt,
      data.totalDuration || 30,
      data.aspectRatio || "16:9",
      data.style || "cinematic",
      "planning"
    ]
  );

  const project = projectResult.rows[0];


  // Create the video job
  const jobResult = await pool.query(
    `
    INSERT INTO video_jobs (
      project_id,
      status,
      total_duration,
      scene_count,
      completed_scenes
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [
      project.id,
      "queued",
      data.totalDuration || 30,
      data.sceneCount || 0,
      0
    ]
  );

  const job = jobResult.rows[0];


  // Save all scenes
  const scenes = data.scenes || [];

  for (const scene of scenes) {

    await pool.query(
      `
      INSERT INTO video_scenes (
        job_id,
        scene_number,
        prompt,
        duration,
        status
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        job.id,
        scene.sceneNumber,
        scene.prompt,
        scene.duration,
        "pending"
      ]
    );

  }


  return {
    id: String(job.id),

    projectId: String(project.id),

    title: project.title,

    prompt: project.prompt,

    status: job.status,

    totalDuration: project.duration,

    sceneDuration:
      data.sceneDuration || 4,

    sceneCount:
      job.scene_count,

    completedScenes:
      job.completed_scenes || 0,

    currentScene:
      job.current_scene,

    aspectRatio:
      project.aspect_ratio,

    style:
      project.style,

    provider:
      data.provider ||
      process.env.VIDORA_VIDEO_PROVIDER ||
      "openai",

    scenes: scenes,

    sceneVideos: [],

    finalVideoPath:
      job.final_video_path,

    error:
      job.error,

    createdAt:
      job.created_at,

    updatedAt:
      job.updated_at
  };
}


// ==========================================
// GET VIDEO JOB
// ==========================================

async function getJob(jobId) {

  const jobResult = await pool.query(
    `
    SELECT
      j.*,
      p.title,
      p.prompt,
      p.duration,
      p.aspect_ratio,
      p.style
    FROM video_jobs j
    JOIN video_projects p
      ON p.id = j.project_id
    WHERE j.id = $1
    `,
    [jobId]
  );


  if (jobResult.rows.length === 0) {
    return null;
  }


  const row = jobResult.rows[0];


  // Get all scenes
  const sceneResult = await pool.query(
    `
    SELECT
      id,
      scene_number,
      prompt,
      duration,
      status,
      video_id,
      video_path,
      created_at
    FROM video_scenes
    WHERE job_id = $1
    ORDER BY scene_number ASC
    `,
    [jobId]
  );


  const scenes = sceneResult.rows;


  const sceneVideos =
    scenes
      .filter(
        (scene) => scene.video_id
      )
      .map(
        (scene) => ({
          sceneNumber:
            scene.scene_number,

          videoId:
            scene.video_id,

          status:
            scene.status,

          videoPath:
            scene.video_path
        })
      );


  return {

    id:
      String(row.id),

    projectId:
      String(row.project_id),

    title:
      row.title,

    prompt:
      row.prompt,

    status:
      row.status,

    totalDuration:
      row.duration,

    sceneDuration:
      scenes.length > 0
        ? scenes[0].duration
        : 4,

    sceneCount:
      row.scene_count,

    completedScenes:
      row.completed_scenes || 0,

    currentScene:
      row.current_scene,

    aspectRatio:
      row.aspect_ratio,

    style:
      row.style,

    finalVideoPath:
      row.final_video_path,

    error:
      row.error,

    scenes:
      scenes.map(
        (scene) => ({
          id:
            scene.id,

          sceneNumber:
            scene.scene_number,

          prompt:
            scene.prompt,

          duration:
            scene.duration,

          status:
            scene.status,

          videoId:
            scene.video_id,

          videoPath:
            scene.video_path
        })
      ),

    sceneVideos:
      sceneVideos,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at
  };
}


// ==========================================
// UPDATE VIDEO JOB
// ==========================================

async function updateJob(
  jobId,
  updates
) {

  const allowedFields = {

    status:
      "status",

    totalDuration:
      "total_duration",

    sceneCount:
      "scene_count",

    completedScenes:
      "completed_scenes",

    currentScene:
      "current_scene",

    finalVideoPath:
      "final_video_path",

    error:
      "error"
  };


  const fields = [];
  const values = [];


  for (
    const [key, value]
    of Object.entries(updates)
  ) {

    if (allowedFields[key]) {

      fields.push(
        `${allowedFields[key]} = $${values.length + 1}`
      );

      values.push(value);
    }
  }


  if (fields.length === 0) {
    return getJob(jobId);
  }


  values.push(jobId);


  const result = await pool.query(
    `
    UPDATE video_jobs
    SET
      ${fields.join(", ")},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $${values.length}
    RETURNING *
    `,
    values
  );


  if (result.rows.length === 0) {
    return null;
  }


  return getJob(jobId);
}


// ==========================================
// UPDATE VIDEO SCENE
// ==========================================

async function updateScene(
  jobId,
  sceneNumber,
  updates
) {

  const allowedFields = {

    status:
      "status",

    videoId:
      "video_id",

    videoPath:
      "video_path"
  };


  const fields = [];
  const values = [];


  for (
    const [key, value]
    of Object.entries(updates)
  ) {

    if (allowedFields[key]) {

      fields.push(
        `${allowedFields[key]} = $${values.length + 1}`
      );

      values.push(value);
    }
  }


  if (fields.length === 0) {
    return null;
  }


  values.push(jobId);
  values.push(sceneNumber);


  const result = await pool.query(
    `
    UPDATE video_scenes
    SET
      ${fields.join(", ")}
    WHERE job_id = $${values.length - 1}
      AND scene_number = $${values.length}
    RETURNING *
    `,
    values
  );


  if (result.rows.length === 0) {
    return null;
  }


  return result.rows[0];
}


// ==========================================
// EXPORTS
// ==========================================

module.exports = {

  createJob,

  getJob,

  updateJob,

  updateScene

};