const loginForm = document.querySelector("#login-form");
const emailInput = document.querySelector("#admin-email");
const passwordInput = document.querySelector("#admin-password");
const emailError = document.querySelector("#email-error");
const passwordError = document.querySelector("#password-error");
const togglePassword = document.querySelector("#toggle-password");

function showError(element, message) {
  element.textContent = message;
  element.hidden = false;
}

function clearError(element) {
  element.textContent = "";
  element.hidden = true;
}

togglePassword.addEventListener("click", () => {
  const showing = passwordInput.type === "text";
  passwordInput.type = showing ? "password" : "text";
  togglePassword.textContent = showing ? "Show" : "Hide";
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  let valid = true;
  clearError(emailError);
  clearError(passwordError);

  if (!/^[^\s@]+@ku\.th$/i.test(email)) {
    showError(emailError, "Enter a valid Kasetsart University email ending in @ku.th.");
    valid = false;
  }
  if (password.length < 8) {
    showError(passwordError, "Enter a password with at least 8 characters.");
    valid = false;
  }
  if (!valid) return;

  localStorage.setItem(
    "kuquest-admin-session",
    JSON.stringify({ email, signedInAt: new Date().toISOString() }),
  );
  location.replace("/");
});

emailInput.focus();
