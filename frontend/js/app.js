const API_BASE =
  "https://vidora-ai-99yg.onrender.com";

const button =
  document.getElementById("createVideo");

const prompt =
  document.getElementById("prompt");

const status =
  document.getElementById("status");

const duration =
  document.getElementById("duration");

const aspectRatio =
  document.getElementById("aspectRatio");

const style =
  document.getElementById("style");

const videoContainer =
  document.getElementById("videoContainer");


// ==========================================
// ACCOUNT ELEMENTS
// ==========================================

const loggedOut =
  document.getElementById("loggedOut");

const loggedIn =
  document.getElementById("loggedIn");

const registerForm =
  document.getElementById("registerForm");

const loginForm =
  document.getElementById("loginForm");

const showRegister =
  document.getElementById("showRegister");

const showLogin =
  document.getElementById("showLogin");

const cancelRegister =
  document.getElementById("cancelRegister");

const cancelLogin =
  document.getElementById("cancelLogin");

const logoutButton =
  document.getElementById("logoutButton");

const registerName =
  document.getElementById("registerName");

const registerEmail =
  document.getElementById("registerEmail");

const registerPassword =
  document.getElementById("registerPassword");

const loginEmail =
  document.getElementById("loginEmail");

const loginPassword =
  document.getElementById("loginPassword");

const accountName =
  document.getElementById("accountName");

const accountEmail =
  document.getElementById("accountEmail");

const accountStatus =
  document.getElementById("accountStatus");


// ==========================================
// AUTHENTICATION STORAGE
// ==========================================

const TOKEN_KEY =
  "vidora_auth_token";

const USER_KEY =
  "vidora_user";


function getToken() {

  return localStorage.getItem(
    TOKEN_KEY
  );
}


function getStoredUser() {

  const user =
    localStorage.getItem(
      USER_KEY
    );

  if (!user) {
    return null;
  }

  try {

    return JSON.parse(
      user
    );

  } catch (error) {

    console.error(
      "Unable to read stored user:",
      error
    );

    return null;
  }
}


function saveAuthentication(
  token,
  user
) {

  localStorage.setItem(
    TOKEN_KEY,
    token
  );

  localStorage.setItem(
    USER_KEY,
    JSON.stringify(user)
  );
}


function clearAuthentication() {

  localStorage.removeItem(
    TOKEN_KEY
  );

  localStorage.removeItem(
    USER_KEY
  );
}


// ==========================================
// AUTHENTICATED REQUEST HEADERS
// ==========================================

function getAuthHeaders() {

  const token =
    getToken();

  const headers = {
    "Content-Type":
      "application/json"
  };

  if (token) {

    headers.Authorization =
      `Bearer ${token}`;
  }

  return headers;
}


// ==========================================
// ACCOUNT INTERFACE
// ==========================================

function updateAccountInterface() {

  const token =
    getToken();

  const user =
    getStoredUser();


  if (
    token &&
    user
  ) {

    loggedOut.style.display =
      "none";

    registerForm.style.display =
      "none";

    loginForm.style.display =
      "none";

    loggedIn.style.display =
      "block";

    accountName.textContent =
      user.name ||
      "User";

    accountEmail.textContent =
      user.email ||
      "";

    button.disabled =
      false;

    return;
  }


  loggedOut.style.display =
    "block";

  registerForm.style.display =
    "none";

  loginForm.style.display =
    "none";

  loggedIn.style.display =
    "none";

  button.disabled =
    true;
}


// ==========================================
// SHOW REGISTER
// ==========================================

showRegister.addEventListener(
  "click",
  () => {

    loggedOut.style.display =
      "none";

    loginForm.style.display =
      "none";

    registerForm.style.display =
      "block";

    accountStatus.textContent =
      "";
  }
);


// ==========================================
// SHOW LOGIN
// ==========================================

showLogin.addEventListener(
  "click",
  () => {

    loggedOut.style.display =
      "none";

    registerForm.style.display =
      "none";

    loginForm.style.display =
      "block";

    accountStatus.textContent =
      "";
  }
);


// ==========================================
// CANCEL REGISTER
// ==========================================

cancelRegister.addEventListener(
  "click",
  () => {

    registerForm.style.display =
      "none";

    loggedOut.style.display =
      "block";

    accountStatus.textContent =
      "";
  }
);


// ==========================================
// CANCEL LOGIN
// ==========================================

cancelLogin.addEventListener(
  "click",
  () => {

    loginForm.style.display =
      "none";

    loggedOut.style.display =
      "block";

    accountStatus.textContent =
      "";
  }
);


// ==========================================
// CREATE ACCOUNT
// ==========================================

registerForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const name =
      registerName.value.trim();

    const email =
      registerEmail.value.trim();

    const password =
      registerPassword.value;


    if (!name) {

      accountStatus.textContent =
        "Please enter your name.";

      return;
    }


    if (!email) {

      accountStatus.textContent =
        "Please enter your email.";

      return;
    }


    if (
      password.length < 8
    ) {

      accountStatus.textContent =
        "Password must be at least 8 characters.";

      return;
    }


    const registerButton =
      document.getElementById(
        "registerButton"
      );

    registerButton.disabled =
      true;

    accountStatus.textContent =
      "Creating your account...";


    try {

      const response =
        await fetch(
          `${API_BASE}/api/auth/register`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              name,
              email,
              password
            })
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.message ||
          "Unable to create account."
        );
      }


      if (
        !data.token ||
        !data.user
      ) {

        throw new Error(
          "The server did not return account authentication information."
        );
      }


      saveAuthentication(
        data.token,
        data.user
      );


      registerForm.reset();

      accountStatus.textContent =
        "Account created successfully.";

      updateAccountInterface();

      loadVideoHistory();


    } catch (error) {

      console.error(
        "Registration error:",
        error
      );

      accountStatus.textContent =
        error.message;


    } finally {

      registerButton.disabled =
        false;
    }
  }
);


// ==========================================
// LOGIN
// ==========================================

loginForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const email =
      loginEmail.value.trim();

    const password =
      loginPassword.value;


    if (!email) {

      accountStatus.textContent =
        "Please enter your email.";

      return;
    }


    if (!password) {

      accountStatus.textContent =
        "Please enter your password.";

      return;
    }


    const loginButton =
      document.getElementById(
        "loginButton"
      );

    loginButton.disabled =
      true;

    accountStatus.textContent =
      "Logging in...";


    try {

      const response =
        await fetch(
          `${API_BASE}/api/auth/login`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              email,
              password
            })
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.message ||
          "Unable to log in."
        );
      }


      if (
        !data.token ||
        !data.user
      ) {

        throw new Error(
          "The server did not return account authentication information."
        );
      }


      saveAuthentication(
        data.token,
        data.user
      );


      loginForm.reset();

      accountStatus.textContent =
        "Login successful.";

      updateAccountInterface();

      loadVideoHistory();


    } catch (error) {

      console.error(
        "Login error:",
        error
      );

      accountStatus.textContent =
        error.message;


    } finally {

      loginButton.disabled =
        false;
    }
  }
);


// ==========================================
// LOGOUT
// ==========================================

logoutButton.addEventListener(
  "click",
  () => {

    clearAuthentication();

    accountStatus.textContent =
      "You have been logged out.";

    status.textContent =
      "";

    videoContainer.innerHTML = `
      <div class="video-result-header">

        <h3>
          🎬 Your Generated Video
        </h3>

        <p>
          Your video will appear here
          when generation is complete.
        </p>

      </div>
    `;

    updateAccountInterface();

    displayVideoHistory([]);
  }
);


// ==========================================
// CREATE VIDEO
// ==========================================

button.addEventListener(
  "click",
  async () => {

    const token =
      getToken();


    if (!token) {

      status.textContent =
        "Please create an account or log in before creating a video.";

      return;
    }


    const videoPrompt =
      prompt.value.trim();


    if (!videoPrompt) {

      status.textContent =
        "Please describe the video you want to create.";

      return;
    }


    button.disabled =
      true;

    videoContainer.innerHTML =
      "";

    status.textContent =
      "Creating your video job...";


    try {

      const response =
        await fetch(
          `${API_BASE}/api/videos/generate`,
          {
            method: "POST",

            headers:
              getAuthHeaders(),

            body: JSON.stringify({
              prompt:
                videoPrompt,

              duration:
                duration.value,

              aspectRatio:
                aspectRatio.value,

              style:
                style.value
            })
          }
        );


      const data =
        await response.json();


      if (
        response.status === 401
      ) {

        clearAuthentication();

        updateAccountInterface();

        throw new Error(
          "Your login session has expired. Please log in again."
        );
      }


      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to create video job."
        );
      }


      const jobId =
        data.jobId;


      if (!jobId) {

        throw new Error(
          "No job ID was returned."
        );
      }


      status.textContent =
        "Video job created. Preparing your video...";


      let finished =
        false;


      while (!finished) {

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              3000
            )
        );


        const jobResponse =
          await fetch(
            `${API_BASE}/api/videos/job/${jobId}`,
            {
              headers:
                getAuthHeaders()
            }
          );


        const jobData =
          await jobResponse.json();


        if (
          jobResponse.status === 401
        ) {

          clearAuthentication();

          updateAccountInterface();

          throw new Error(
            "Your login session has expired. Please log in again."
          );
        }


        if (!jobResponse.ok) {

          throw new Error(
            jobData.message ||
            "Unable to check video job."
          );
        }


        const job =
          jobData.job;


        if (
          job.status === "queued"
        ) {

          status.textContent =
            "Your video is queued...";
        }


        else if (
          job.status === "generating"
        ) {

          const completed =
            job.completedScenes || 0;

          const total =
            job.sceneCount || 0;

          status.textContent =
            `Generating video... Scene ${completed} of ${total}`;
        }


        else if (
          job.status === "assembling"
        ) {

          status.textContent =
            "Assembling your finished video...";
        }


        else if (
          job.status === "uploading"
        ) {

          status.textContent =
            "Uploading your finished video securely...";
        }


        else if (
          job.status === "completed"
        ) {

          finished =
            true;

          status.textContent =
            "Your video is ready!";


          displayFinishedVideo(
            jobId,
            jobData.videoUrl,
            jobData.downloadUrl
          );


          loadVideoHistory();
        }


        else if (
          job.status === "failed"
        ) {

          finished =
            true;

          status.textContent =
            "Video generation failed: " +
            (
              job.error ||
              "Unknown error."
            );
        }


        else if (
          job.status === "cancelled"
        ) {

          finished =
            true;

          status.textContent =
            "Video generation was cancelled.";
        }
      }


    } catch (error) {

      console.error(
        "Vidora AI error:",
        error
      );

      status.textContent =
        "Unable to create video: " +
        error.message;


    } finally {

      button.disabled =
        false;
    }
  }
);


// ==========================================
// DISPLAY FINISHED VIDEO
// ==========================================

function displayFinishedVideo(
  jobId,
  videoUrl,
  downloadUrl
) {

  const fullVideoUrl =
    videoUrl
      ? `${API_BASE}${videoUrl}`
      : `${API_BASE}/api/videos/job/${jobId}/video`;


  const fullDownloadUrl =
    downloadUrl
      ? `${API_BASE}${downloadUrl}`
      : `${API_BASE}/api/videos/job/${jobId}/download`;


  videoContainer.innerHTML = `

    <div class="result-card">

      <h2>
        Your Video Is Ready 🎬
      </h2>

      <video
        class="result-video"
        controls
        playsinline
        preload="metadata"
      >

        <source
          src="${fullVideoUrl}"
          type="video/mp4"
        />

        Your browser does not support
        HTML5 video.

      </video>


      <div class="result-actions">

        <a
          class="download-button"
          href="${fullDownloadUrl}"
          download
        >
          Download Video
        </a>

      </div>

    </div>

  `;
}


// ==========================================
// LOAD VIDEO HISTORY
// ==========================================

async function loadVideoHistory() {

  const token =
    getToken();


  if (!token) {

    displayVideoHistory([]);

    return;
  }


  try {

    const response =
      await fetch(
        `${API_BASE}/api/videos/history`,
        {
          headers:
            getAuthHeaders()
        }
      );


    const data =
      await response.json();


    if (
      response.status === 401
    ) {

      clearAuthentication();

      updateAccountInterface();

      displayVideoHistory([]);

      return;
    }


    if (!response.ok) {

      throw new Error(
        data.message ||
        "Unable to load video history."
      );
    }


    displayVideoHistory(
      data.history || []
    );


  } catch (error) {

    console.error(
      "History error:",
      error
    );
  }
}


// ==========================================
// DISPLAY VIDEO HISTORY
// ==========================================

function displayVideoHistory(
  history
) {

  const existing =
    document.getElementById(
      "videoHistory"
    );


  if (!existing) {
    return;
  }


  if (
    history.length === 0
  ) {

    existing.innerHTML = `

      <div class="history-empty">

        <h3>
          Your Video History
        </h3>

        <p>
          Your generated videos will
          appear here.
        </p>

      </div>

    `;

    return;
  }


  existing.innerHTML = `

    <div class="history-header">

      <h2>
        Your Video History
      </h2>

      <span>
        ${history.length}
        video${history.length === 1 ? "" : "s"}
      </span>

    </div>


    <div class="history-list">

      ${history.map(
        (video) => {

          const date =
            new Date(
              video.createdAt
            ).toLocaleString();


          const videoUrl =
            video.status === "completed"
              ? `${API_BASE}/api/videos/job/${video.id}/video`
              : null;


          const downloadUrl =
            video.status === "completed"
              ? `${API_BASE}/api/videos/job/${video.id}/download`
              : null;


          return `

            <div class="history-item">

              <div class="history-info">

                <h3>
                  ${escapeHtml(
                    video.prompt
                  )}
                </h3>


                <p>
                  ${video.duration || 0}
                  seconds •
                  ${escapeHtml(
                    video.style ||
                    "cinematic"
                  )}
                </p>


                <small>
                  ${date}
                </small>

              </div>


              <div class="history-status">

                <strong>
                  ${escapeHtml(
                    video.status
                  )}
                </strong>

              </div>


              ${
                video.status === "completed"
                  ? `

                    <div class="history-actions">

                      <button
                        type="button"
                        onclick="playHistoryVideo('${videoUrl}')"
                      >
                        ▶ Play
                      </button>


                      <a
                        href="${downloadUrl}"
                        download
                      >
                        Download
                      </a>

                    </div>

                  `
                  : ""
              }

            </div>

          `;
        }
      ).join("")}

    </div>

  `;
}


// ==========================================
// PLAY VIDEO FROM HISTORY
// ==========================================

function playHistoryVideo(
  videoUrl
) {

  videoContainer.innerHTML = `

    <div class="result-card">

      <h2>
        Video from History 🎬
      </h2>


      <video
        class="result-video"
        controls
        playsinline
        autoplay
      >

        <source
          src="${videoUrl}"
          type="video/mp4"
        />

        Your browser does not support
        HTML5 video.

      </video>

    </div>

  `;


  videoContainer.scrollIntoView({
    behavior: "smooth"
  });
}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(
  value
) {

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


// ==========================================
// INITIAL ACCOUNT STATE
// ==========================================

updateAccountInterface();


// ==========================================
// LOAD HISTORY WHEN PAGE OPENS
// ==========================================

loadVideoHistory();