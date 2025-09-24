/**
 * Навчальна програма для перекладу фраз з німецької на українську
 * Модульна архітектура з використанням сучасного JavaScript (ES6+)
 */

class TranslationApp {
  constructor() {
    this.data = null;
    this.currentSection = null;
    this.currentCardIndex = 0;
    this.cardsPerSection = 5;
    // Language state for content and UI
    this.sourceLang = "de";
    this.targetLang = "uk";
    this.uiLang = "de"; // interface language (for i18n)
    this.currentCards = [];
    this.sectionKeys = [];
    this.showTranslation = false; // Новий стан для контролю відображення перекладу

    // DOM елементи
    this.elements = {
      loadingMessage: document.getElementById("loadingMessage"),
      errorMessage: document.getElementById("errorMessage"),
      cardsContainer: document.getElementById("cardsContainer"),
      directionBtn: document.getElementById("directionBtn"),
      directionText: document.querySelector(".direction-text"),
      sourceLangSelect: document.getElementById("sourceLangSelect"),
      targetLangSelect: document.getElementById("targetLangSelect"),
      currentSection: document.getElementById("currentSection"),
      progressCounter: document.getElementById("progressCounter"),
      nextBtn: document.getElementById("nextBtn"),
      restartBtn: document.getElementById("restartBtn"),
      totalSections: document.getElementById("totalSections"),
      cardsInSection: document.getElementById("cardsInSection"),
    };

    // UI strings for simple i18n
    this.uiStrings = {
      de: {
        title: "Häufige Phrasen für Dialoge",
        next: "Weiter",
        restart: "Neu starten",
        translationUnavailable: "Übersetzung nicht verfügbar",
        sourceLabel: "Quellsprache",
        targetLabel: "Zielsprache",
        sectionComplete: "Abschnitt abgeschlossen",
        nextSection: "Nächster Abschnitt",
        sectionCompleteMessage:
          'Abschnitt abgeschlossen. Klicken Sie auf "Weiter", um zum nächsten Abschnitt zu gelangen.',
      },
      uk: {
        title: "Поширені фрази для діалогу",
        next: "Далі",
        restart: "Почати знову",
        translationUnavailable: "Переклад недоступний",
        sourceLabel: "Мова-джерело",
        targetLabel: "Мова перекладу",
        sectionComplete: "Розділ завершено",
        nextSection: "Наступний розділ",
        sectionCompleteMessage:
          'Розділ завершено. Натисніть "Далі" для переходу до наступного розділу.',
      },
    };

    this.init();
  }

  /**
   * Ініціалізація програми
   */
  async init() {
    try {
      await this.loadData();
      this.setupEventListeners();
      this.startLearning();
    } catch (error) {
      console.error("Помилка ініціалізації:", error);
      this.showError();
    }
  }

  /**
   * Завантаження даних з JSON файлу
   */
  async loadData() {
    try {
      const response = await fetch("./data.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.data = await response.json();

      // Отримуємо ключі розділів
      this.sectionKeys = Object.keys(this.data.SprechenTeil3);

      // Приховуємо повідомлення про завантаження
      this.elements.loadingMessage.style.display = "none";

      // Оновлюємо інформацію про розділи
      this.updateSectionsInfo();
    } catch (error) {
      console.error("Помилка завантаження даних:", error);
      throw error;
    }
  }

  /**
   * Налаштування обробників подій
   */
  setupEventListeners() {
    // Кнопка зміни напрямку перекладу
    this.elements.directionBtn.addEventListener("click", () => {
      this.swapLanguages();
    });

    // Кнопка "Далі"
    this.elements.nextBtn.addEventListener("click", () => {
      this.nextCard();
    });

    // Кнопка "Почати знову"
    this.elements.restartBtn.addEventListener("click", () => {
      this.restart();
    });

    // Підтримка клавіатури
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        if (!this.elements.nextBtn.disabled) {
          this.nextCard();
        }
      } else if (
        e.key === "Enter" &&
        this.elements.restartBtn.style.display !== "none"
      ) {
        e.preventDefault();
        this.restart();
      }
    });

    // Зміна мови-джерела/цілі
    if (this.elements.sourceLangSelect) {
      this.elements.sourceLangSelect.value = this.sourceLang;
      this.elements.sourceLangSelect.addEventListener("change", (e) => {
        this.sourceLang = e.target.value;
        if (this.sourceLang === this.targetLang) {
          // Якщо обрані однакові, перемістити target на іншу опцію автоматично
          const firstDifferent = Array.from(
            this.elements.targetLangSelect.options
          ).find((o) => o.value !== this.sourceLang);
          if (firstDifferent)
            this.elements.targetLangSelect.value = firstDifferent.value;
          this.targetLang = this.elements.targetLangSelect.value;
        }
        this.showTranslation = false;
        this.updateDirectionText();
        this.displayCurrentCard();
      });
    }

    if (this.elements.targetLangSelect) {
      this.elements.targetLangSelect.value = this.targetLang;
      this.elements.targetLangSelect.addEventListener("change", (e) => {
        this.targetLang = e.target.value;
        if (this.sourceLang === this.targetLang) {
          const firstDifferent = Array.from(
            this.elements.sourceLangSelect.options
          ).find((o) => o.value !== this.targetLang);
          if (firstDifferent)
            this.elements.sourceLangSelect.value = firstDifferent.value;
          this.sourceLang = this.elements.sourceLangSelect.value;
        }
        this.showTranslation = false;
        this.updateDirectionText();
        this.displayCurrentCard();
      });
    }
  }

  /**
   * Початок навчання
   */
  startLearning() {
    if (this.sectionKeys.length === 0) {
      this.showError("Немає доступних розділів для навчання");
      return;
    }

    this.currentSection = 0;
    this.currentCardIndex = 0;
    this.prepareCurrentSection();
    this.displayCurrentCard();
    this.updateDirectionText();
    this.setUITitles();
  }

  /**
   * Підготовка поточного розділу
   */
  prepareCurrentSection() {
    const sectionKey = this.sectionKeys[this.currentSection];
    const sectionData = this.data.SprechenTeil3[sectionKey];

    // Беремо максимум 5 карток з поточного розділу
    this.currentCards = sectionData.slice(0, this.cardsPerSection);
    this.currentCardIndex = 0;
    this.showTranslation = false; // Скидаємо стан перекладу для нового розділу

    // Оновлюємо інформацію про поточний розділ
    this.updateSectionInfo();
    this.updateProgressInfo();
  }

  /**
   * Відображення поточної картки
   */
  displayCurrentCard() {
    if (this.currentCardIndex >= this.currentCards.length) {
      this.showSectionComplete();
      return;
    }

    const card = this.currentCards[this.currentCardIndex];
    if (!card) {
      console.error("Картка не знайдена для індексу:", this.currentCardIndex);
      return;
    }

    // Скидаємо стан перекладу тільки для нової картки (не при показі перекладу)
    // Це буде зроблено в nextCard() при переході до нової картки

    const cardHTML = this.createCardHTML(card);

    // Приховуємо повідомлення про завантаження та помилки
    this.elements.loadingMessage.style.display = "none";
    this.elements.errorMessage.style.display = "none";

    // Очищуємо контейнер та додаємо нову картку
    this.elements.cardsContainer.innerHTML = cardHTML;

    // Додаємо анімацію появи
    const newCard = this.elements.cardsContainer.querySelector(".card");
    if (newCard) {
      newCard.classList.add("appear");
    }

    // Оновлюємо стан кнопок
    this.updateButtonStates();
  }

  /**
   * Показ перекладу на поточній картці
   */
  showTranslationCard() {
    const currentCard = this.elements.cardsContainer?.querySelector(".card");
    if (!currentCard) {
      console.warn("Не знайдено поточну картку для показу перекладу");
      return;
    }

    const card = this.currentCards[this.currentCardIndex];
    if (!card) {
      console.error("Картка не знайдена для індексу:", this.currentCardIndex);
      return;
    }

    // Dynamic languages
    const mainTranslation = card[this.targetLang];
    const translationLabel = this.getLanguageDisplayName(this.targetLang);

    // Variants: attempt to find options arrays for the chosen languages, fall back to generic lists
    const options = {
      main: card[`options_${this.sourceLang}`] || [],
      translation: card[`options_${this.targetLang}`] || [],
    };

    // Створюємо HTML для перекладу
    const translationHTML = `
      <div class="main-phrase lang-${this.targetLang}">
        <div class="phrase-label">${translationLabel}</div>
        <div class="phrase-text">${
          mainTranslation || this.uiStrings[this.uiLang].translationUnavailable
        }</div>
      </div>
      ${this.createOptionsHTML(options, this.sourceLang, this.targetLang)}
    `;

    // Додаємо переклад до існуючої картки
    currentCard.insertAdjacentHTML("beforeend", translationHTML);

    // Додаємо анімацію появи для нового контенту
    const newTranslation = currentCard.querySelector(".main-phrase:last-child");
    if (newTranslation) {
      newTranslation.style.opacity = "0";
      newTranslation.style.transform = "translateY(20px)";

      setTimeout(() => {
        newTranslation.style.transition = "all 0.5s ease-out";
        newTranslation.style.opacity = "1";
        newTranslation.style.transform = "translateY(0)";
      }, 50);
    }
  }

  /**
   * Створення HTML для картки
   */
  createCardHTML(card) {
    // Основна фраза від джерела
    const mainPhrase = card[this.sourceLang];
    const mainLabel = this.getLanguageDisplayName(this.sourceLang);

    return `
      <div class="card">
        <div class="main-phrase lang-${this.sourceLang}">
          <div class="phrase-label">${mainLabel}</div>
          <div class="phrase-text">${mainPhrase || ""}</div>
        </div>
      </div>
    `;
  }

  /**
   * Створення HTML для варіантів перекладу
   */
  createOptionsHTML(options, sourceLang, targetLang) {
    const mainLabel = `Варіанти (${sourceLang.toUpperCase()})`;
    const translationLabel = `Варіанти (${targetLang.toUpperCase()})`;

    // Перевіряємо, чи є варіанти для відображення
    const hasMainOptions = options.main && options.main.length > 0;
    const hasTranslationOptions =
      options.translation && options.translation.length > 0;

    if (!hasMainOptions && !hasTranslationOptions) {
      return "";
    }

    let html = '<div class="options-container">';

    // Основні варіанти (ліва колонка)
    if (hasMainOptions) {
      html += `
                <div class="options-group">
                    <div class="options-label">${mainLabel}</div>
                    <ul class="options-list">
                        ${options.main
                          .map(
                            (option) => `<li class="option-item">${option}</li>`
                          )
                          .join("")}
                    </ul>
                </div>
            `;
    } else {
      html += '<div class="options-group"></div>';
    }

    // Варіанти перекладу (права колонка)
    if (hasTranslationOptions) {
      html += `
                <div class="options-group">
                    <div class="options-label">${translationLabel}</div>
                    <ul class="options-list">
                        ${options.translation
                          .map(
                            (option) => `<li class="option-item">${option}</li>`
                          )
                          .join("")}
                    </ul>
                </div>
            `;
    } else {
      html += '<div class="options-group"></div>';
    }

    html += "</div>";
    return html;
  }

  /**
   * Перехід до наступної картки
   */
  nextCard() {
    // Перевіряємо, чи це кнопка "Наступний розділ"
    const nextBtnText =
      this.elements.nextBtn?.querySelector("span:first-child");
    const isNextSection =
      nextBtnText?.textContent ===
      (this.uiStrings[this.uiLang]?.nextSection || "Наступний розділ");

    if (isNextSection) {
      // Якщо це перехід до наступного розділу
      this.nextSection();
      return;
    }

    // Якщо переклад ще не показано, показуємо його
    if (!this.showTranslation) {
      this.showTranslation = true;
      this.showTranslationCard();
      return;
    }

    // Звичайний перехід до наступної картки
    const currentCard = this.elements.cardsContainer?.querySelector(".card");

    if (currentCard) {
      currentCard.classList.add("fade-out");

      setTimeout(() => {
        this.currentCardIndex++;

        // Скидаємо стан перекладу для нової картки
        this.showTranslation = false;

        if (this.currentCardIndex >= this.currentCards.length) {
          this.showSectionComplete();
        } else {
          this.displayCurrentCard();
        }

        this.updateProgressInfo();
      }, 300);
    } else {
      console.warn("Не знайдено поточну картку для переходу");
    }
  }

  /**
   * Показ завершення розділу
   */
  showSectionComplete() {
    const isLastSection = this.currentSection >= this.sectionKeys.length - 1;

    // Приховуємо повідомлення про завантаження та помилки
    this.elements.loadingMessage.style.display = "none";
    this.elements.errorMessage.style.display = "none";

    const title =
      this.uiStrings[this.uiLang]?.sectionComplete || "Section complete";
    const message = isLastSection
      ? this.uiStrings[this.uiLang]?.sectionEndMessage ||
        this.uiStrings[this.uiLang]?.sectionCompleteMessage ||
        "Congratulations — you finished all sections."
      : this.uiStrings[this.uiLang]?.sectionCompleteMessage ||
        this.uiStrings[this.uiLang]?.sectionComplete ||
        "Section complete.";

    this.elements.cardsContainer.innerHTML = `
      <div class="card appear">
        <div class="main-phrase" style="text-align: center;">
          <div class="phrase-label">${title}</div>
          <div class="phrase-text">${message}</div>
        </div>
      </div>
    `;

    if (isLastSection) {
      this.elements.nextBtn.style.display = "none";
      this.elements.restartBtn.style.display = "flex";
      this.elements.nextBtn.disabled = true;
    } else {
      // Показуємо кнопку "Далі" для переходу до наступного розділу
      this.elements.nextBtn.style.display = "flex";
      this.elements.restartBtn.style.display = "none";
      this.elements.nextBtn.disabled = false;

      // Змінюємо текст кнопки
      const nextBtnText =
        this.elements.nextBtn.querySelector("span:first-child");
      if (nextBtnText) {
        nextBtnText.textContent =
          this.uiStrings[this.uiLang]?.nextSection ||
          this.uiStrings[this.uiLang]?.next ||
          "Next";
      }
    }

    this.updateButtonStates();
  }

  /**
   * Перехід до наступного розділу
   */
  nextSection() {
    this.currentSection++;
    this.showTranslation = false; // Скидаємо стан перекладу для нового розділу
    this.prepareCurrentSection();
    this.displayCurrentCard();

    // Показуємо кнопку "Далі" знову
    this.elements.nextBtn.style.display = "flex";
    this.elements.restartBtn.style.display = "none";

    // Повертаємо текст кнопки до нормального стану
    const nextBtnText = this.elements.nextBtn.querySelector("span:first-child");
    if (nextBtnText) {
      nextBtnText.textContent = this.uiStrings[this.uiLang]?.next || "Next";
    }
  }

  /**
   * Перемикання напрямку перекладу
   */
  toggleTranslationDirection() {
    // kept for backward compatibility: call swapLanguages
    this.swapLanguages();
  }

  /**
   * Перезапуск програми
   */
  restart() {
    this.currentSection = 0;
    this.currentCardIndex = 0;
    this.showTranslation = false;
    this.prepareCurrentSection();
    this.displayCurrentCard();

    // Повертаємо кнопки до початкового стану
    this.elements.nextBtn.style.display = "flex";
    this.elements.restartBtn.style.display = "none";
    this.elements.nextBtn.disabled = false;

    // Повертаємо текст кнопки до нормального стану
    const nextBtnText = this.elements.nextBtn.querySelector("span:first-child");
    if (nextBtnText) {
      nextBtnText.textContent = this.uiStrings[this.uiLang]?.next || "Next";
    }
  }

  /**
   * Оновлення інформації про розділ
   */
  updateSectionInfo() {
    const sectionKey = this.sectionKeys[this.currentSection];
    const sectionName = this.getSectionDisplayName(sectionKey);
    this.elements.currentSection.textContent = sectionName;
    this.elements.cardsInSection.textContent = this.currentCards.length;
  }

  getLanguageDisplayName(code) {
    const map = {
      de: "Deutsch",
      uk: "Українська",
      ar: "العربية",
      tr: "Türkçe",
      en: "English",
      vi: "Tiếng Việt",
      es: "Español",
      bg: "Български",
    };
    return map[code] || code.toUpperCase();
  }

  updateDirectionText() {
    if (this.elements.directionText) {
      const src = this.sourceLang.toUpperCase();
      const tgt = this.targetLang.toUpperCase();
      this.elements.directionText.textContent = `${src} → ${tgt}`;
    }
  }

  swapLanguages() {
    const tmp = this.sourceLang;
    this.sourceLang = this.targetLang;
    this.targetLang = tmp;
    // update selects if present
    if (this.elements.sourceLangSelect)
      this.elements.sourceLangSelect.value = this.sourceLang;
    if (this.elements.targetLangSelect)
      this.elements.targetLangSelect.value = this.targetLang;
    this.showTranslation = false;
    this.updateDirectionText();
    this.displayCurrentCard();
  }

  setUITitles() {
    // set header title according to uiLang
    try {
      const header = document.querySelector(".app-header h1");
      if (
        header &&
        this.uiStrings[this.uiLang] &&
        this.uiStrings[this.uiLang].title
      ) {
        header.textContent = this.uiStrings[this.uiLang].title;
      }
      // next button text
      const nextBtnText =
        this.elements.nextBtn.querySelector("span:first-child");
      if (nextBtnText)
        nextBtnText.textContent = this.uiStrings[this.uiLang].next;
      const restartBtnText =
        this.elements.restartBtn.querySelector("span:first-child");
      if (restartBtnText)
        restartBtnText.textContent = this.uiStrings[this.uiLang].restart;
    } catch (e) {
      // ignore if elements not present yet
    }
  }

  /**
   * Оновлення інформації про прогрес
   */
  updateProgressInfo() {
    const current = this.currentCardIndex + 1;
    const total = this.currentCards.length;
    this.elements.progressCounter.textContent = `${current} / ${total}`;
  }

  /**
   * Оновлення інформації про всі розділи
   */
  updateSectionsInfo() {
    this.elements.totalSections.textContent = this.sectionKeys.length;
  }

  /**
   * Оновлення стану кнопок
   */
  updateButtonStates() {
    const isLastCard = this.currentCardIndex >= this.currentCards.length - 1;
    const isLastSection = this.currentSection >= this.sectionKeys.length - 1;

    this.elements.nextBtn.disabled = isLastCard && isLastSection;
  }

  /**
   * Отримання відображуваного імені розділу
   */
  getSectionDisplayName(sectionKey) {
    const sectionNames = {
      "1_Begruessung": "Привітання",
      "2_Gespraech_Beginn": "Початок розмови",
      "3_Vorschlag_machen": "Пропозиції",
      "4_Zustimmung": "Згода",
      "5_Ablehnung": "Відмова",
      "6_Zeit_vorschlagen": "Час та зустрічі",
      "7_Weg_Transport": "Транспорт",
      "8_Verabschiedung": "Прощання",
    };

    return sectionNames[sectionKey] || sectionKey;
  }

  /**
   * Показ повідомлення про помилку
   */
  showError(
    message = "Fehler beim Laden der Daten. Bitte prüfen Sie die Datei data.json"
  ) {
    this.elements.loadingMessage.style.display = "none";
    this.elements.errorMessage.style.display = "block";

    const errorText = this.elements.errorMessage.querySelector("p");
    if (errorText) {
      errorText.textContent = message;
    }
  }
}

/**
 * Ініціалізація програми після завантаження DOM
 */
document.addEventListener("DOMContentLoaded", () => {
  // Перевіряємо підтримку Fetch API
  if (!window.fetch) {
    console.error(
      "Ваш браузер не підтримує Fetch API. Будь ласка, оновіть браузер."
    );
    document.getElementById("loadingMessage").innerHTML = `
            <div class="error-message">
                <p>Ihr Browser unterstützt Fetch API nicht. Bitte aktualisieren Sie Ihren Browser.</p>
            </div>
        `;
    return;
  }

  // Ініціалізуємо програму
  new TranslationApp();
});

/**
 * Обробка помилок глобально
 */
window.addEventListener("error", (event) => {
  console.error("Глобальна помилка:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Необроблена помилка Promise:", event.reason);
});
