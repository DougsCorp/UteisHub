/**
 * Conversor de Moedas - Aplicação Principal
 * @version 2.0.0
 * @description Conversor de moedas com cotações em tempo real
 */

(function() {
    'use strict';

    // ============================================
    // Configuração
    // ============================================
    
    const CONFIG = {
        apis: [
            {
                name: 'AwesomeAPI',
                url: 'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL,JPY-BRL',
                type: 'awesome'
            },
            {
                name: 'ExchangeRate-API',
                url: 'https://api.exchangerate-api.com/v4/latest/USD',
                type: 'exchangerate'
            },
            {
                name: 'Open Exchange Rates',
                url: 'https://open.er-api.com/v6/latest/USD',
                type: 'openex'
            }
        ],
        commonValues: [1, 5, 10, 25, 50, 100, 500, 1000],
        toastDuration: 3000
    };

    const CURRENCY_NAMES = {
        USD: 'Dólar Americano',
        EUR: 'Euro',
        GBP: 'Libra Esterlina',
        BRL: 'Real Brasileiro',
        JPY: 'Iene Japonês',
        CAD: 'Dólar Canadense',
        AUD: 'Dólar Australiano',
        CHF: 'Franco Suíço',
        CNY: 'Yuan Chinês',
        ARS: 'Peso Argentino'
    };

    const CURRENCY_SYMBOLS = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        BRL: 'R$',
        JPY: '¥',
        CAD: 'C$',
        AUD: 'A$',
        CHF: 'Fr',
        CNY: '¥',
        ARS: '$'
    };

    // ============================================
    // Estado da Aplicação
    // ============================================
    
    const state = {
        exchangeRates: {},
        baseCurrency: 'BRL',
        lastUpdateTime: null
    };

    // ============================================
    // Elementos do DOM
    // ============================================
    
    const elements = {};

    function cacheElements() {
        elements.fromAmount = document.getElementById('fromAmount');
        elements.toAmount = document.getElementById('toAmount');
        elements.fromCurrency = document.getElementById('fromCurrency');
        elements.toCurrency = document.getElementById('toCurrency');
        elements.swapButton = document.getElementById('swapCurrencies');
        elements.refreshButton = document.getElementById('refreshRates');
        elements.refreshIcon = document.getElementById('refreshIcon');
        elements.exchangeRate = document.getElementById('exchangeRate');
        elements.lastUpdate = document.getElementById('lastUpdate');
        elements.conversionTable = document.getElementById('conversionTable');
        elements.tableFromCurrency = document.getElementById('tableFromCurrency');
        elements.tableToCurrency = document.getElementById('tableToCurrency');
        elements.usdRate = document.getElementById('usdRate');
        elements.eurRate = document.getElementById('eurRate');
        elements.gbpRate = document.getElementById('gbpRate');
        elements.jpyRate = document.getElementById('jpyRate');
    }

    // ============================================
    // Funções de Formatação
    // ============================================
    
    function formatNumber(value, decimals = 2) {
        if (isNaN(value) || value === null) return '0,00';
        return value.toLocaleString('pt-BR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    function parseFormattedNumber(str) {
        if (!str) return 0;
        const cleaned = str.toString().replace(/\./g, '').replace(',', '.');
        const value = parseFloat(cleaned);
        return isNaN(value) ? 0 : value;
    }

    function formatDateTime(date) {
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // ============================================
    // Funções de API
    // ============================================
    
    function processAwesomeAPI(data) {
        const usdToBrl = parseFloat(data['USDBRL']?.bid || 0);
        const eurToBrl = parseFloat(data['EURBRL']?.bid || 0);
        const gbpToBrl = parseFloat(data['GBPBRL']?.bid || 0);
        const jpyToBrl = parseFloat(data['JPYBRL']?.bid || 0);
        
        const rates = {
            BRL: 1,
            USD: usdToBrl,
            EUR: eurToBrl,
            GBP: gbpToBrl,
            JPY: jpyToBrl / 100
        };
        
        if (usdToBrl > 0) {
            rates.CAD = usdToBrl * 0.74;
            rates.AUD = usdToBrl * 0.66;
            rates.CHF = usdToBrl * 1.14;
            rates.CNY = usdToBrl * 0.14;
            rates.ARS = usdToBrl * 0.001;
        }
        
        return {
            base: 'BRL',
            rates: rates,
            timestamp: data['USDBRL']?.timestamp ? parseInt(data['USDBRL'].timestamp) * 1000 : Date.now()
        };
    }

    function processStandardAPI(data, type) {
        const usdRates = data.rates || {};
        let usdToBrl = usdRates.BRL || 5.42;
        
        const rates = {
            BRL: 1,
            USD: usdToBrl,
            EUR: usdRates.EUR ? usdToBrl / usdRates.EUR : 0,
            GBP: usdRates.GBP ? usdToBrl / usdRates.GBP : 0,
            JPY: usdRates.JPY ? usdToBrl / usdRates.JPY : 0,
            CAD: usdRates.CAD ? usdToBrl / usdRates.CAD : 0,
            AUD: usdRates.AUD ? usdToBrl / usdRates.AUD : 0,
            CHF: usdRates.CHF ? usdToBrl / usdRates.CHF : 0,
            CNY: usdRates.CNY ? usdToBrl / usdRates.CNY : 0,
            ARS: usdRates.ARS ? usdToBrl / usdRates.ARS : 0
        };
        
        return {
            base: 'BRL',
            rates: rates,
            timestamp: data.time_last_update_unix ? data.time_last_update_unix * 1000 : Date.now()
        };
    }

    async function fetchExchangeRates() {
        for (const api of CONFIG.apis) {
            try {
                const response = await fetch(api.url, {
                    headers: { 'Accept': 'application/json' }
                });
                
                if (!response.ok) throw new Error(`${api.name} error`);
                
                const data = await response.json();
                let processedData = api.type === 'awesome' 
                    ? processAwesomeAPI(data) 
                    : processStandardAPI(data, api.type);
                
                if (processedData.rates?.USD > 0) {
                    return processedData;
                }
            } catch (error) {
                continue;
            }
        }
        throw new Error('Todas as APIs falharam');
    }

    async function updateRates() {
        setLoadingState(true);
        
        try {
            const data = await fetchExchangeRates();
            
            if (data?.rates) {
                state.exchangeRates = data.rates;
                state.baseCurrency = data.base || 'BRL';
                state.lastUpdateTime = data.timestamp ? new Date(data.timestamp) : new Date();
                
                updateUI();
                convert('from');
                
                const usdRate = state.exchangeRates.USD?.toFixed(2) || '--';
                showToast(`Cotações atualizadas! USD: R$ ${usdRate}`, 'success');
            }
        } catch (error) {
            showToast('Erro ao atualizar cotações.', 'error');
            if (Object.keys(state.exchangeRates).length === 0) {
                useFallbackRates();
            }
        } finally {
            setLoadingState(false);
        }
    }

    function useFallbackRates() {
        state.exchangeRates = {
            BRL: 1, USD: 5.42, EUR: 5.70, GBP: 6.90,
            JPY: 0.036, CAD: 3.85, AUD: 3.45,
            CHF: 6.10, CNY: 0.75, ARS: 0.005
        };
        state.baseCurrency = 'BRL';
        state.lastUpdateTime = new Date();
        
        updateUI();
        if (elements.lastUpdate) {
            elements.lastUpdate.textContent = 'Dados offline';
        }
    }

    // ============================================
    // Funções de Conversão
    // ============================================
    
    function getConversionRate(from, to) {
        if (from === to) return 1;
        
        const fromRate = from === 'BRL' ? 1 : (state.exchangeRates[from] || 0);
        const toRate = to === 'BRL' ? 1 : (state.exchangeRates[to] || 0);
        
        if (!fromRate || !toRate) return 0;
        return fromRate / toRate;
    }

    function convert(direction = 'from') {
        if (Object.keys(state.exchangeRates).length === 0) return;
        
        const fromCurrency = elements.fromCurrency.value;
        const toCurrency = elements.toCurrency.value;
        const rate = getConversionRate(fromCurrency, toCurrency);
        
        if (direction === 'from') {
            const fromValue = parseFormattedNumber(elements.fromAmount.value);
            elements.toAmount.value = fromValue > 0 ? formatNumber(fromValue * rate) : '';
        } else {
            const toValue = parseFormattedNumber(elements.toAmount.value);
            elements.fromAmount.value = toValue > 0 ? formatNumber(toValue / rate) : '';
        }
        
        updateExchangeRateDisplay();
        updateConversionTable();
    }

    function swapCurrencies() {
        const tempCurrency = elements.fromCurrency.value;
        elements.fromCurrency.value = elements.toCurrency.value;
        elements.toCurrency.value = tempCurrency;
        
        const tempValue = elements.fromAmount.value;
        elements.fromAmount.value = elements.toAmount.value;
        elements.toAmount.value = tempValue;
        
        convert('from');
    }

    // ============================================
    // Funções de UI
    // ============================================
    
    function updateUI() {
        updateExchangeRateDisplay();
        updatePopularRates();
        updateConversionTable();
        updateLastUpdateTime();
    }

    function updateExchangeRateDisplay() {
        const from = elements.fromCurrency.value;
        const to = elements.toCurrency.value;
        const rate = getConversionRate(from, to);
        
        elements.exchangeRate.textContent = rate > 0 
            ? `1 ${from} = ${formatNumber(rate, 4)} ${to}` 
            : '--';
    }

    function updatePopularRates() {
        const rates = state.exchangeRates;
        
        if (rates.USD > 0 && elements.usdRate) {
            elements.usdRate.textContent = `R$ ${formatNumber(rates.USD)}`;
        }
        if (rates.EUR > 0 && elements.eurRate) {
            elements.eurRate.textContent = `R$ ${formatNumber(rates.EUR)}`;
        }
        if (rates.GBP > 0 && elements.gbpRate) {
            elements.gbpRate.textContent = `R$ ${formatNumber(rates.GBP)}`;
        }
        if (rates.JPY > 0 && elements.jpyRate) {
            elements.jpyRate.textContent = `R$ ${formatNumber(rates.JPY, 4)}`;
        }
        
        ['usdChange', 'eurChange', 'gbpChange', 'jpyChange'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '';
        });
    }

    function updateConversionTable() {
        const from = elements.fromCurrency.value;
        const to = elements.toCurrency.value;
        const rate = getConversionRate(from, to);
        
        elements.tableFromCurrency.textContent = from;
        elements.tableToCurrency.textContent = to;
        
        const fromSymbol = CURRENCY_SYMBOLS[from] || '';
        const toSymbol = CURRENCY_SYMBOLS[to] || '';
        
        elements.conversionTable.innerHTML = CONFIG.commonValues.map(value => `
            <div class="grid grid-cols-2 border-b border-gray-100 table-row">
                <div class="p-4 text-gray-700">${fromSymbol} ${formatNumber(value)}</div>
                <div class="p-4 text-gray-900 font-medium">${toSymbol} ${formatNumber(value * rate)}</div>
            </div>
        `).join('');
    }

    function updateLastUpdateTime() {
        if (state.lastUpdateTime && elements.lastUpdate) {
            elements.lastUpdate.textContent = formatDateTime(state.lastUpdateTime);
        }
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            elements.refreshIcon?.classList.add('animate-spin');
            if (elements.refreshButton) elements.refreshButton.disabled = true;
        } else {
            elements.refreshIcon?.classList.remove('animate-spin');
            if (elements.refreshButton) elements.refreshButton.disabled = false;
        }
    }

    function showToast(message, type = 'success') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => toast.classList.add('show'));
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, CONFIG.toastDuration);
    }

    // ============================================
    // Event Handlers
    // ============================================
    
    function handleAmountInput(event, direction) {
        let value = event.target.value.replace(/[^\d.,]/g, '').replace('.', ',');
        const parts = value.split(',');
        
        if (parts.length > 2) {
            value = parts[0] + ',' + parts.slice(1).join('');
        }
        if (parts.length === 2 && parts[1].length > 2) {
            value = parts[0] + ',' + parts[1].substring(0, 2);
        }
        
        event.target.value = value;
        convert(direction);
    }

    function setupEventListeners() {
        elements.fromAmount?.addEventListener('input', e => handleAmountInput(e, 'from'));
        elements.fromAmount?.addEventListener('focus', e => e.target.select());
        
        elements.toAmount?.addEventListener('input', e => handleAmountInput(e, 'to'));
        elements.toAmount?.addEventListener('focus', e => e.target.select());
        
        elements.fromCurrency?.addEventListener('change', () => convert('from'));
        elements.toCurrency?.addEventListener('change', () => convert('from'));
        
        elements.swapButton?.addEventListener('click', swapCurrencies);
        elements.refreshButton?.addEventListener('click', updateRates);
        
        document.addEventListener('keydown', e => {
            if (e.key === 'Enter' && (document.activeElement === elements.fromAmount || 
                                       document.activeElement === elements.toAmount)) {
                convert('from');
            }
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                updateRates();
            }
        });

        // FAQ Accordion
        document.querySelectorAll('.faq-question').forEach(question => {
            question.addEventListener('click', () => {
                const item = question.closest('.faq-item');
                item.classList.toggle('open');
            });
        });
    }

    // ============================================
    // Inicialização
    // ============================================
    
    async function init() {
        cacheElements();
        setupEventListeners();
        
        if (elements.fromAmount) {
            elements.fromAmount.value = '1,00';
        }
        
        await updateRates();
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // PWA Support
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // Ready for service worker registration
        });
    }

})();

