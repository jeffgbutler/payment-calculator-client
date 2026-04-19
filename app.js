import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('payment-calculator-client');

Vue.createApp({
  data() {
    return {
      started: false,
      chaotic: false,
      paymentHistory: [],
      errorHistory: [],
      baseURL: "http://localhost:8080",
      frequency: 1000
    };
  },
  computed: {
    normalizedBaseURL: function() {
      return this.baseURL.replace(/\/+$/, '');
    },
    startDisabled: function() {
      return this.started || this.baseURL === "";
    },
    hasPaymentHistory: function() {
      return this.paymentHistory.length > 0;
    },
    hasErrors: function() {
      return this.errorHistory.length > 0;
    }
  },
  methods: {
    start: function() {
      this.started = true;
      this.scheduleUpdate();
    },
    stop: function() {
      this.started = false;
    },
    clear: function() {
      this.paymentHistory = [];
      this.errorHistory = [];
    },
    scheduleUpdate: function() {
      setTimeout(() => this.getPayment(), this.frequency);
    },
    addError: function(request, err) {
      this.errorHistory.unshift({
        request: request,
        message: err.message,
        timestamp: new Date().toLocaleString(),
      });
      this.errorHistory = this.errorHistory.slice(0, 10);
    },
    addPayment: function(data) {
      this.paymentHistory.unshift({
        amount: data.amount,
        rate: data.rate,
        years: data.years,
        payment: data.payment,
        timestamp: new Date().toLocaleString(),
        instance: data.instance,
        count: data.count
      });
      this.paymentHistory = this.paymentHistory.slice(0, 5);
    },
    getPayment: function() {
      let rate = Math.floor(Math.random() * 7);
      let amount = 100000.0 + Math.random() * 700000.00;
      amount = Math.floor(amount * 100.0) / 100.0;
      let years = 30;

      tracer.startActiveSpan('payment.request', {
        attributes: {
          'payment.amount': amount,
          'payment.rate': rate,
          'payment.years': years,
          'payment.chaotic': this.chaotic,
        },
      }, (span) => {
        const chaoticParam = this.chaotic ? '&chaotic=true' : '';
        fetch(`${this.normalizedBaseURL}/payment?amount=${amount}&rate=${rate}&years=${years}${chaoticParam}`, {method: 'GET'})
        .then(res => {
          if (!res.ok) {
            span.setAttribute('error', true);
            throw new Error(`Received response ${res.status}`)
          }
          return res.json();
        })
        .then((data) => {
          span.setAttribute('payment.result', data.payment);
          this.addPayment(data);
        })
        .catch((err) => {
          span.setAttribute('error', true);
          span.recordException(err);
          this.addError(`Details: a=${amount}, r=${rate}, y=${years}`, err);
        })
        .finally(() => {
          span.end();
          if (this.started) {
            this.scheduleUpdate();
          }
        });
      });
    },
    crashIt: function() {
      fetch(`${this.normalizedBaseURL}/crash`, {method: 'GET'})
      .catch((err) => {
        this.addError('Crash Request', err);
      });
    },
    resetCount() {
      fetch(`${this.normalizedBaseURL}/resetCount`, {method: 'GET'})
      .catch((err) => {
        this.addError('Reset Count Request', err);
      });
    }
  }
}).mount('#app');
