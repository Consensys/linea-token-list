/* global fetch document console  */
let allTokens = {};
let filteredTokens = {};

async function fetchTokensAndDisplay(path, elementId) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error('Network response was not ok' + response.statusText);
    }
    const data = await response.json();

    allTokens[elementId] = data.tokens;
    filteredTokens[elementId] = data.tokens;
    const tokensHTML = generateTokensHTML(data.tokens, elementId);
    document.getElementById(elementId).innerHTML = tokensHTML;
    updateTokenCounts();
  } catch (error) {
    console.error('There has been a problem with your fetch operation:', error);
  }
}

function updateTokenCounts() {
  const shortListTokens = filteredTokens['mainnetShortList'];
  const fullListTokens = filteredTokens['mainnetFullList'];

  document.getElementById('shortListCount').innerText = `(${shortListTokens ? shortListTokens.length : 0} tokens)`;
  document.getElementById('fullListCount').innerText = `(${fullListTokens ? fullListTokens.length : 0} tokens)`;
}

function generateTokensHTML(tokens, elementId) {
  let highlightAddresses = [];

  // Highlight logic for mainnetFullList
  if (elementId === 'mainnetFullList') {
    const shortListAddresses = filteredTokens['mainnetShortList']?.map((token) => token.address) || [];
    highlightAddresses = tokens
      .map((token) => token.address)
      .filter((address) => !shortListAddresses.includes(address));
  }

  return tokens
    .map(
      (token, index) => `
      <div class="token card bg-base-200 ${
        highlightAddresses.includes(token.address) ? 'border border-gray-200' : 'bordered'
      } shadow-xl space-y-4 m-4" style="width: 480px;">
      <div class="card-body space-y-2">
        <div class="flex flex-row space-x-4 items-center">
          <div class="badge badge-primary">${index + 1}</div>
          <div class="card-image" style="width: 64px;">
            ${token.logoURI ? `<img src="${token.logoURI}" alt="${token.name}">` : ``}
          </div>
          <div class="space-y-2 w-full">
            <p class="font-bold text-md">
              ${token.name}
              <span class="text-gray-400">${token.symbol}</span>
            </p>
            <div class="text-sm w-full flex justify-between">
              <span>Decimals: ${token.decimals}</span>
              ${
                highlightAddresses.includes(token.address)
                  ? `<span class="badge badge-warning">Not in shortlist</span>`
                  : ``
              }
            </div>
            <div class="text-sm space-x-2 py-2">
              ${generateTokenTypesHTML(token.tokenType)}
            </div>
          </div>
        </div>
       
        ${generateAddress1LinkHTML(token)}
        ${generateAddress2LinkHTML(token)}
      </div>
    </div>
  `
    )
    .join('');
}

function generateAddress1LinkHTML(token) {
  let layer = '';

  // Determine the base URL based on the chainId
  switch (token.chainId) {
    case 1:
      layer = 'Ethereum';
      break;
    case 59144:
      layer = 'Linea';
      break;
    default:
      return ''; // Optionally handle other chainId values
  }

  return `<p class="text-gray-500 text-sm flex justify-between">
  <span class='text-gray-400'>${layer}</span>
  <a href="${token.tokenId}" target="_blank" class="link text-gray-400">${token.address}</a>
</p>`;
}

function generateAddress2LinkHTML(token) {
  // Check if the rootAddress is defined
  if (!token.extension?.rootAddress) {
    return '';
  }

  let baseURL = '';
  let layer = '';

  // Determine the base URL based on the chainId
  switch (token.chainId) {
    case 1:
      baseURL = 'https://lineascan.build/address/';
      layer = 'Linea';
      break;
    case 59144:
      baseURL = 'https://etherscan.io/address/';
      layer = 'Ethereum';
      break;
    default:
      return ''; // Optionally handle other chainId values
  }

  const href = baseURL + token.extension.rootAddress;

  return `<p class="text-gray-500 text-sm flex justify-between">
            <span class='text-gray-400'>${layer}</span>
            <a href="${href}" target="_blank" class="link text-gray-400">${token.extension.rootAddress}</a>
          </p>`;
}

function generateTokenTypesHTML(tokenTypes) {
  return tokenTypes.map((type) => `<div class="badge badge-outline">${type}</div>`).join('');
}

document.querySelectorAll('.filter-btn').forEach((button) => {
  button.addEventListener('click', function (e) {
    const type = e.currentTarget.getAttribute('data-type'); // Get the selected type

    // Remove active class from all buttons and add to the clicked button
    document.querySelectorAll('.filter-btn').forEach((btn) => btn.classList.remove('btn-primary'));
    e.currentTarget.classList.add('btn-primary');

    // Filter and display tokens
    filterAndDisplayTokens(type, 'mainnetShortList');
    filterAndDisplayTokens(type, 'mainnetFullList');
  });
});

function filterAndDisplayTokens(type, elementId) {
  let tokensToDisplay;

  // Check if type is 'all' and display all tokens, otherwise filter based on type
  if (type === 'all') {
    tokensToDisplay = allTokens[elementId];
  } else {
    tokensToDisplay = allTokens[elementId].filter((token) => token.tokenType.includes(type));
  }

  // Generate HTML and update display
  filteredTokens[elementId] = tokensToDisplay;
  const tokensHTML = generateTokensHTML(tokensToDisplay, elementId);
  document.getElementById(elementId).innerHTML = tokensHTML;

  updateTokenCounts();
}

// Search
document.getElementById('searchInput').addEventListener('input', function (e) {
  const searchQuery = e.target.value.toLowerCase();
  let selectedType = 'all';

  // If there's an active filter button, use its type
  const activeButton = document.querySelector('.filter-btn.btn-primary');
  if (activeButton) {
    selectedType = activeButton.getAttribute('data-type');
  }

  // Define a filter function that checks both name and type
  const tokenFilter = (token) => {
    const nameMatch =
      token.name.toLowerCase().includes(searchQuery) || token.symbol.toLowerCase().includes(searchQuery);
    const typeMatch = selectedType === 'all' || token.tokenType.includes(selectedType);

    return nameMatch && typeMatch;
  };

  // Apply filter function to both short and full lists, and update HTML
  ['mainnetShortList', 'mainnetFullList'].forEach((elementId) => {
    filteredTokens[elementId] = allTokens[elementId].filter(tokenFilter);
    const tokensHTML = generateTokensHTML(filteredTokens[elementId], elementId);
    document.getElementById(elementId).innerHTML = tokensHTML;
  });

  updateTokenCounts();
});

// Fetch and display data from the specified paths
(async function fetchAndDisplayTokensInOrder() {
  await fetchTokensAndDisplay('./json/linea-mainnet-token-shortlist.json', 'mainnetShortList');
  await fetchTokensAndDisplay('./json/linea-mainnet-token-fulllist.json', 'mainnetFullList');
})();
