const key = "fca_live_cZzfKQyfflRU4EyrRugDcEo7fl323V4AyDc5c9cm";

const state = {
  openedDrawer: null,
  currencies: [],
  filteredCurrencies: [],
  base: "USD",
  target: "EUR",
  rates: {},  // rates: {
  //                 USD: {
  //                      INR: 83.25,     // 1 USD = 83.25 INR
  //                      EUR: 0.91       // 1 USD = 0.91 EUR
  //                    }
  //                  }
  baseValue: 1,
};

//* selectors

const ui = {
  controls: document.getElementById("controls"),
  drawer: document.getElementById("drawer"),
  dismissBtn: document.getElementById("dismiss-btn"),
  currencyList: document.getElementById("currency-list"),
  searchInput: document.getElementById("search"),
  baseBtn: document.getElementById("base"),
  targetBtn: document.getElementById("target"),
  exchangeRate: document.getElementById("exchange-rate"),
  baseInput: document.getElementById("base-input"),
  targetInput: document.getElementById("target-input"),
  swapBtn: document.getElementById("swap-btn"),
};


//* event listeners

const setupEventListeners = () => {
  document.addEventListener("DOMContentLoaded", initApp);
  ui.controls.addEventListener("click", showDrawer);
  ui.dismissBtn.addEventListener("click", hideDrawer);
  ui.searchInput.addEventListener("input", filterCurrency);
  ui.currencyList.addEventListener("click", selectPair);
  ui.baseInput.addEventListener("change", convertInput);
  ui.swapBtn.addEventListener("click", switchPair);
};

//* event handlers

const initApp = () => {
  getUserLocationCurrency(); 
  fetchCurrencies();
  fetchExchangeRate();
};

const showDrawer = (e) => {
  if (e.target.hasAttribute("data-drawer")) {
    state.openedDrawer = e.target.id;
    ui.drawer.classList.add("show");
  }
};

const hideDrawer = () => {
  clearSearchInput();
  state.openedDrawer = null;
  ui.drawer.classList.remove("show");
};

const filterCurrency = () => {
  const keyword = ui.searchInput.value.trim().toLowerCase();

  state.filteredCurrencies = getAvailableCurrencies().filter(
    ({ code, name }) => {
      return (
        code.toLowerCase().includes(keyword) ||
        name.toLowerCase().includes(keyword)
      );
    }
  );

  displayCurrencies();
};

const selectPair = (e) => {
  if (e.target.hasAttribute("data-code")) {
    const { openedDrawer } = state;

    // update the base or target in the state
    state[openedDrawer] = e.target.dataset.code;

    // load the exchange rates then update the btns
    loadExchangeRate();

    // close the drawer after selection
    hideDrawer();
  }
};

const convertInput = () => {
  state.baseValue = parseFloat(ui.baseInput.value) || 1;
  loadExchangeRate();
};

const switchPair = () => {
  const { base, target } = state;
  state.base = target;
  state.target = base;
  state.baseValue = parseFloat(ui.targetInput.value) || 1;
  loadExchangeRate();
};

//* render functions

const displayCurrencies = () => {
  ui.currencyList.innerHTML = state.filteredCurrencies
    .map(({ code, name }) => {
      return `
      <li data-code="${code}">
        <img src="${getImageURL(code)}" alt="${name}" />
        <div>
          <h4>${code}</h4>
          <p>${name}</p>
        </div>
      </li>
    `;
    })
    .join("");
};

const displayConversion = () => {
  updateButtons();
  updateInputs();
  updateExchangeRate();
};

const showLoading = () => {
  ui.controls.classList.add("skeleton");
  ui.exchangeRate.classList.add("skeleton");  
};

const hideLoading = () => {
  ui.controls.classList.remove("skeleton");
  ui.exchangeRate.classList.remove("skeleton");
};

//* helper functions

const updateButtons = () => {
  const buttons = [ui.baseBtn, ui.targetBtn];

  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    const code = state[btn.id];

    btn.textContent = code;
    btn.style.setProperty("--image", `url(${getImageURL(code)})`);
  }

};

const updateInputs = () => {
  const { base, baseValue, target, rates } = state;

  const result = baseValue * rates[base][target];

  ui.targetInput.value = result.toFixed(2);
  ui.baseInput.value = baseValue;
};

const updateExchangeRate = () => {
  const { base, target, rates } = state;

  const rate = rates[base][target].toFixed(2);

  ui.exchangeRate.textContent = `1 ${base} = ${rate} ${target}`;
};

const getAvailableCurrencies = () => {
  return state.currencies.filter(({ code }) => {
    return state.base !== code && state.target !== code;
  });
};

const clearSearchInput = () => {
  ui.searchInput.value = "";
  ui.searchInput.dispatchEvent(new Event("input"));
};

const getImageURL = (code) => {
  return `https://wise.com/public-resources/assets/flags/rectangle/${code.toLowerCase()}.png`;
};


const loadExchangeRate = () => {
  const { base, rates } = state;
  if (typeof rates[base] !== "undefined") {
    // if the base rates are already in the state, then show it
    displayConversion();
  } else {
    // else, fetch the updated exchange rates
    fetchExchangeRate();
  }
};

//* api functions

const fetchCurrencies = () => {
  fetch(`https://api.freecurrencyapi.com/v1/currencies?apikey=${key}`)
    .then((response) => response.json())
    .then(({ data }) => {
      state.currencies = Object.values(data); // [   { "code": "USD", "name": "United States Dollar", "symbol": "$" },
      state.filteredCurrencies = getAvailableCurrencies();
      displayCurrencies();
    })
    .catch(console.error);
};

const fetchExchangeRate = () => {
  const { base } = state;

  showLoading();

  fetch(
    `https://api.freecurrencyapi.com/v1/latest?apikey=${key}&base_currency=${base}`
  )
    .then((response) => response.json())
    .then(({ data }) => {
      state.rates[base] = data;
      displayConversion();
    })
    .catch(console.error)
    .finally(hideLoading);
};

//* initialization

setupEventListeners();


const getUserLocationCurrency = async () => {
  try {
    const response = await fetch(`https://ipinfo.io/json?token=5227e7e33e7295`);
    const data = await response.json();

    const country = data.country; // e.g., "IN" for India, "US" for the USA
    const currency = mapCountryToCurrency(country);

    // Set the base currency based on location
    state.base = currency;

    // Update the UI with the local currency
    displayConversion();
  } catch (error) {
    console.error("Failed to fetch location:", error);
  }
};

const mapCountryToCurrency = (country) => {
  const countryToCurrency = {
    US: "USD",
    IN: "INR",
    CA: "CAD",
    GB: "GBP",
    AU: "AUD",
    EU: "EUR",
    JP: "JPY",
    CN: "CNY",
    SG: "SGD",
    AE: "AED",
    BR: "BRL",
    MX: "MXN",
  };

  return countryToCurrency[country] || "USD"; // Default to USD if not found
};
