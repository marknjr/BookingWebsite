function checkPassword() {
  var password = document.getElementById("password").value;
  var requirements = document.getElementById("password-requirements");
  if (password.length < 8 || !/[!@$%^&*]/.test(password)) {
    requirements.style.display = "block";
  } else {
    requirements.style.display = "none";
  }
}
