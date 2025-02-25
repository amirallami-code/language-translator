// Wait for DOM to be fully loaded before accessing elements
document.addEventListener("DOMContentLoaded", () => {
  // Define all DOM elements first
  const dropdowns = document.querySelectorAll(".dropdown-container");
  const inputLanguageDropdown = document.querySelector("#input-language");
  const outputLanguageDropdown = document.querySelector("#output-language");
  const swapBtn = document.querySelector(".swap-position");
  const inputLanguage = inputLanguageDropdown.querySelector(".selected");
  const outputLanguage = outputLanguageDropdown.querySelector(".selected");
  const inputTextElem = document.querySelector("#input-text");
  const outputTextElem = document.querySelector("#output-text");
  const uploadDocument = document.querySelector("#upload-document");
  const uploadTitle = document.querySelector("#upload-title");
  const downloadBtn = document.querySelector("#download-btn");
  const darkModeCheckbox = document.getElementById("dark-mode-btn");
  const inputChars = document.querySelector("#input-chars");

  // Set focus on the input text area
  inputTextElem.focus();

  // Populate dropdown function
  function populateDropdown(dropdown, options) {
    dropdown.querySelector("ul").innerHTML = "";
    options.forEach((option) => {
      const li = document.createElement("li");
      const title = `${option.name} (${option.native})`;
      li.innerHTML = title;
      li.dataset.value = option.code;
      li.classList.add("option");
      dropdown.querySelector("ul").appendChild(li);
    });
  }

  // Populate the dropdowns
  populateDropdown(inputLanguageDropdown, languages);
  populateDropdown(outputLanguageDropdown, languages);

  // Setup dropdown event listeners
  dropdowns.forEach((dropdown) => {
    dropdown.addEventListener("click", (e) => {
      dropdown.classList.toggle("active");
    });

    dropdown.querySelectorAll(".option").forEach((item) => {
      item.addEventListener("click", (e) => {
        //remove active class from current dropdowns
        dropdown.querySelectorAll(".option").forEach((item) => {
          item.classList.remove("active");
        });
        item.classList.add("active");
        const selected = dropdown.querySelector(".selected");
        selected.innerHTML = item.innerHTML;
        selected.dataset.value = item.dataset.value;
        translate();
      });
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", (e) => {
    dropdowns.forEach((dropdown) => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove("active");
      }
    });
  });

  // Debounce function to limit API calls
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

  // Translation function
  function translate() {
    const inputText = inputTextElem.value;
    if (!inputText.trim()) {
      outputTextElem.value = "";
      return;
    }

    const inputLanguage = inputLanguageDropdown.querySelector(".selected").dataset.value;
    const outputLanguage = outputLanguageDropdown.querySelector(".selected").dataset.value;

    // Don't translate if languages are the same (except for auto)
    if (inputLanguage === outputLanguage && inputLanguage !== "auto") {
      outputTextElem.value = inputText;
      return;
    }

    // Visual indicator that translation is happening
    outputTextElem.value = "Translating...";

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${inputLanguage}&tl=${outputLanguage}&dt=t&q=${encodeURI(inputText)}`;

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((json) => {
        if (json && json[0]) {
          outputTextElem.value = json[0].map((item) => item[0]).join("");
        } else {
          outputTextElem.value = "Translation error: Unexpected API response";
        }
      })
      .catch((error) => {
        console.log(error);
        outputTextElem.value = "Translation failed. Please try again later.";
      });
  }

  // Swap button functionality
  swapBtn.addEventListener("click", (e) => {
    // disable swap button if input language is Auto
    if (inputLanguage.dataset.value === "auto") {
      // Visual indication for disabled state
      swapBtn.classList.add("swap-disabled");
      setTimeout(() => {
        swapBtn.classList.remove("swap-disabled");
      }, 500);
      return;
    }

    // Add animation class
    swapBtn.classList.add("swap-animation");
    setTimeout(() => {
      swapBtn.classList.remove("swap-animation");
    }, 300);

    const temp = inputLanguage.innerHTML;
    inputLanguage.innerHTML = outputLanguage.innerHTML;
    outputLanguage.innerHTML = temp;

    const tempValue = inputLanguage.dataset.value;
    inputLanguage.dataset.value = outputLanguage.dataset.value;
    outputLanguage.dataset.value = tempValue;

    // Swap text
    const tempInputText = inputTextElem.value;
    inputTextElem.value = outputTextElem.value;
    outputTextElem.value = tempInputText;

    // Update character count
    inputChars.innerHTML = inputTextElem.value.length;

    translate();
  });

  // Input text event listener with debounce
  inputTextElem.addEventListener("input", debounce((e) => {
    // Update character count
    inputChars.innerHTML = inputTextElem.value.length;

    // Limit input to 5000 characters
    if (inputTextElem.value.length > 5000) {
      inputTextElem.value = inputTextElem.value.slice(0, 5000);
      inputChars.innerHTML = inputTextElem.value.length;
    }

    // Only translate if there's content
    if (inputTextElem.value.trim().length > 0) {
      translate();
    } else {
      outputTextElem.value = "";
    }
  }, 500)); // 500ms delay before translation happens

  // File upload handling
  uploadDocument.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    uploadTitle.innerHTML = file.name;

    if (file.type === "text/plain") {
      // Handle text files
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = (e) => {
        const content = e.target.result;
        // Limit to 5000 chars if needed
        inputTextElem.value = content.length > 5000 ? content.slice(0, 5000) : content;
        inputChars.innerHTML = inputTextElem.value.length;
        translate();
      };
    } else if (file.type === "application/pdf" ||
      file.type === "application/msword" ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      // Provide feedback about non-text files
      alert("Note: Only text content can be extracted from these file types. For best results, use plain text files.");

      // For this simple version, we'll just inform the user
      inputTextElem.value = "File format requires additional processing.\nPlease copy and paste the text directly for best results.";
      inputChars.innerHTML = inputTextElem.value.length;
    } else {
      alert("Please upload a valid file (TXT, PDF, DOC, or DOCX)");
      uploadTitle.innerHTML = "Upload a Document";
    }
  });

  // Download functionality
  downloadBtn.addEventListener("click", (e) => {
    const outputText = outputTextElem.value;
    if (!outputText.trim()) {
      alert("There is no translated text to download");
      return;
    }

    const outputLanguage = outputLanguageDropdown.querySelector(".selected").dataset.value;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `translated-to-${outputLanguage}-${timestamp}.txt`;

    const blob = new Blob([outputText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = filename;
    a.href = url;
    a.click();

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
  });

  // Dark mode toggle
  darkModeCheckbox.addEventListener("change", () => {
    document.body.classList.toggle("dark");
    // Optionally save preference to localStorage
    localStorage.setItem("darkMode", darkModeCheckbox.checked);
  });

  // Set default input language (Auto)
  const defaultInputOption = inputLanguageDropdown.querySelector('[data-value="auto"]');
  if (defaultInputOption) {
    const inputSelected = inputLanguageDropdown.querySelector(".selected");
    inputSelected.innerHTML = defaultInputOption.innerHTML;
    inputSelected.dataset.value = defaultInputOption.dataset.value;
    defaultInputOption.classList.add("active");
  }

  // Set default output language (English)
  const defaultOutputOption = outputLanguageDropdown.querySelector('[data-value="en"]');
  if (defaultOutputOption) {
    const outputSelected = outputLanguageDropdown.querySelector(".selected");
    outputSelected.innerHTML = defaultOutputOption.innerHTML;
    outputSelected.dataset.value = defaultOutputOption.dataset.value;
    defaultOutputOption.classList.add("active");
  }

  // Add keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Ctrl+Enter to translate
    if (e.ctrlKey && e.key === "Enter") {
      translate();
    }

    // Ctrl+S to download
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      downloadBtn.click();
    }

    // Ctrl+Shift+S to swap languages
    if (e.ctrlKey && e.shiftKey && e.key === "S") {
      e.preventDefault();
      swapBtn.click();
    }
  });

  // Load dark mode preference if saved
  const savedDarkMode = localStorage.getItem("darkMode");
  if (savedDarkMode === "true") {
    darkModeCheckbox.checked = true;
    document.body.classList.add("dark");
  }
});