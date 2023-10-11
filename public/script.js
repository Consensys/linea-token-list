function fetchTokensAndDisplay(path, elementId) {
  fetch(path)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok' + response.statusText);
      }
      return response.json();
    })
    .then((data) => {
      const tokensHTML = generateTokensHTML(data.tokens);
      document.getElementById(elementId).innerHTML = tokensHTML;
    })
    .catch((error) => {
      console.error('There has been a problem with your fetch operation:', error);
    });
}

function generateTokensHTML(tokens) {
  return tokens
    .map(
      (token, index) => `
    <div class="token card bordered bg-base-200 shadow-xl space-y-4 m-4" style="width: 500px;">
      <div class="card-body space-y-4">
        <div class="flex flex-row space-x-4 items-center">
          <div class="badge badge-primary">${index + 1}</div>
          <div class="card-image" style="width: 64px;">
            <img src="${token.logoURI}" alt="${token.name}">
          </div>
          <div class="space-y-2">
            <p class="font-bold text-md">
              ${token.name}
              <span class="text-gray-400">${token.symbol}</span>
            </p>
            <p class="text-sm">
              Decimals: ${token.decimals}
            </p>
            <p class="text-sm">
              ${generateTokenTypesHTML(token.tokenType)}
            </p>
          </div>
        </div>
        <p class="text-gray-500">
          <a href="${token.tokenId}" targe="_blank" class="link text-gray-400">${token.address}</a>
        </p>
        ${generateAddressLinkHTML(token)}
      </div>
    </div>
  `
    )
    .join('');
}

function generateAddressLinkHTML(token) {
  // Check if the rootAddress is defined
  if (!token.extension?.rootAddress) {
    return '';
  }

  let baseURL = '';

  // Determine the base URL based on the chainId
  switch (token.chainId) {
    case 1:
      baseURL = 'https://etherscan.io/address/';
      break;
    case 59144:
      baseURL = 'https://lineascan.build/address/';
      break;
    default:
      return ''; // Optionally handle other chainId values
  }

  const href = baseURL + token.extension.rootAddress;

  return `<p class="text-gray-500">
            <a href="${href}" target="_blank" class="link text-gray-400">${token.extension.rootAddress}</a>
          </p>`;
}

function generateTokenTypesHTML(tokenTypes) {
  return tokenTypes.map((type) => `<div class="badge badge-outline">${type}</div>`).join('');
}

// Fetch and display data from the specified paths
fetchTokensAndDisplay('./json/linea-mainnet-token-shortlist.json', 'mainnetShortList');
fetchTokensAndDisplay('./json/linea-mainnet-token-fulllist.json', 'mainnetFullList');
