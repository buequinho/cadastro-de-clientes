const STORAGE_KEY = "clientes-loja-roupas-v2";

const form = document.getElementById("customer-form");
const list = document.getElementById("customers-list");
const search = document.getElementById("search");
const template = document.getElementById("customer-template");

let customers = normalizeCustomers(loadCustomers());

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const customer = {
    id: crypto.randomUUID(),
    name: document.getElementById("name").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    email: document.getElementById("email").value.trim(),
    creditLimit: Number(document.getElementById("limit").value) || 0,
    purchases: [],
    payments: [],
    createdAt: new Date().toISOString(),
  };

  customers.unshift(customer);
  persist();
  form.reset();
  document.getElementById("limit").value = "0";
  render();
});

search.addEventListener("input", render);

function render() {
  const query = search.value.trim().toLowerCase();
  list.innerHTML = "";

  const filtered = customers.filter((customer) => {
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.phone.toLowerCase().includes(query)
    );
  });

  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Nenhum cliente encontrado.";
    list.appendChild(empty);
    return;
  }

  filtered.forEach((customer) => {
    const totals = getTotals(customer);
    const fragment = template.content.cloneNode(true);

    fragment.querySelector(".customer-name").textContent = customer.name;
    fragment.querySelector(".customer-contact").textContent = `${customer.phone}${
      customer.email ? ` • ${customer.email}` : ""
    }`;
    fragment.querySelector(".customer-credit").textContent = `Limite: ${money(customer.creditLimit)} | Compras: ${money(
      totals.totalPurchases
    )} | Pagamentos: ${money(totals.totalPayments)}`;
    fragment.querySelector(".customer-debt").textContent = `Saldo devedor: ${money(
      totals.outstanding
    )} | Em atraso: ${money(totals.overdue)}`;

    const badge = fragment.querySelector(".badge");
    if (totals.outstanding === 0) {
      badge.className = "badge ok";
      badge.textContent = "Sem dívida";
    } else if (totals.overdue > 0) {
      badge.className = "badge alert";
      badge.textContent = "Vencido";
    } else {
      badge.className = "badge warning";
      badge.textContent = "A vencer";
    }

    bindEditForm(fragment, customer);
    bindPurchaseForm(fragment, customer);
    bindPaymentForm(fragment, customer);
    bindDelete(fragment, customer);
    renderPurchases(fragment, customer);
    renderPayments(fragment, customer);

    list.appendChild(fragment);
  });
}

function bindEditForm(fragment, customer) {
  const editForm = fragment.querySelector(".edit-form");
  editForm.querySelector(".edit-name").value = customer.name;
  editForm.querySelector(".edit-phone").value = customer.phone;
  editForm.querySelector(".edit-email").value = customer.email || "";
  editForm.querySelector(".edit-limit").value = customer.creditLimit;

  editForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const index = customers.findIndex((entry) => entry.id === customer.id);
    if (index === -1) return;

    customers[index].name = editForm.querySelector(".edit-name").value.trim();
    customers[index].phone = editForm.querySelector(".edit-phone").value.trim();
    customers[index].email = editForm.querySelector(".edit-email").value.trim();
    customers[index].creditLimit = Number(editForm.querySelector(".edit-limit").value) || 0;

    persist();
    render();
  });
}

function bindPurchaseForm(fragment, customer) {
  const purchaseForm = fragment.querySelector(".purchase-form");
  purchaseForm.querySelector(".purchase-date").value = todayISO();

  purchaseForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const amount = Number(purchaseForm.querySelector(".purchase-amount").value);
    const date = purchaseForm.querySelector(".purchase-date").value;
    const dueDate = purchaseForm.querySelector(".purchase-due").value;

    if (!amount || amount <= 0 || !date || !dueDate) return;

    const index = customers.findIndex((entry) => entry.id === customer.id);
    if (index === -1) return;

    customers[index].purchases.unshift({
      id: crypto.randomUUID(),
      amount,
      date,
      dueDate,
    });

    persist();
    render();
  });
}

function bindPaymentForm(fragment, customer) {
  const paymentForm = fragment.querySelector(".payment-form");

  paymentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = Number(paymentForm.querySelector(".payment-amount").value);
    if (!amount || amount <= 0) return;

    const index = customers.findIndex((entry) => entry.id === customer.id);
    if (index === -1) return;

    customers[index].payments.unshift({
      id: crypto.randomUUID(),
      amount,
      date: new Date().toISOString(),
    });

    persist();
    render();
  });
}

function bindDelete(fragment, customer) {
  const deleteBtn = fragment.querySelector(".delete-btn");
  deleteBtn.addEventListener("click", () => {
    customers = customers.filter((entry) => entry.id !== customer.id);
    persist();
    render();
  });
}

function renderPurchases(fragment, customer) {
  const ul = fragment.querySelector(".purchase-history");
  const purchases = [...customer.purchases].sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  const paymentApplied = getPaymentAllocation(customer);

  if (!purchases.length) {
    const li = document.createElement("li");
    li.textContent = "Sem compras registradas.";
    ul.appendChild(li);
    return;
  }

  purchases.forEach((purchase) => {
    const li = document.createElement("li");
    const paidPart = paymentApplied.byPurchaseId[purchase.id] || 0;
    const pending = Math.max(purchase.amount - paidPart, 0);
    const overdue = pending > 0 && isPastDate(purchase.dueDate);

    li.textContent = `${formatDateOnly(purchase.date)} | Compra: ${money(purchase.amount)} | Pago: ${money(
      paidPart
    )} | Em aberto: ${money(pending)} | Vence: ${formatDateOnly(purchase.dueDate)}${
      overdue ? " (ATRASADO)" : ""
    }`;
    ul.appendChild(li);
  });
}

function renderPayments(fragment, customer) {
  const ul = fragment.querySelector(".payment-history");

  if (!customer.payments.length) {
    const li = document.createElement("li");
    li.textContent = "Sem pagamentos registrados.";
    ul.appendChild(li);
    return;
  }

  customer.payments.forEach((payment) => {
    const li = document.createElement("li");
    li.textContent = `${formatDate(payment.date)} — ${money(payment.amount)}`;
    ul.appendChild(li);
  });
}

function getTotals(customer) {
  const totalPurchases = customer.purchases.reduce((acc, item) => acc + item.amount, 0);
  const totalPayments = customer.payments.reduce((acc, item) => acc + item.amount, 0);
  const outstanding = Math.max(totalPurchases - totalPayments, 0);

  const allocation = getPaymentAllocation(customer);
  const overdue = customer.purchases.reduce((acc, purchase) => {
    const paid = allocation.byPurchaseId[purchase.id] || 0;
    const pending = Math.max(purchase.amount - paid, 0);
    if (pending > 0 && isPastDate(purchase.dueDate)) {
      return acc + pending;
    }
    return acc;
  }, 0);

  return { totalPurchases, totalPayments, outstanding, overdue };
}

function getPaymentAllocation(customer) {
  const purchases = [...customer.purchases].sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  let remainingPayment = customer.payments.reduce((acc, item) => acc + item.amount, 0);
  const byPurchaseId = {};

  purchases.forEach((purchase) => {
    if (remainingPayment <= 0) {
      byPurchaseId[purchase.id] = 0;
      return;
    }
    const paid = Math.min(purchase.amount, remainingPayment);
    byPurchaseId[purchase.id] = paid;
    remainingPayment -= paid;
  });

  return { byPurchaseId };
}

function isPastDate(yyyyMmDd) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${yyyyMmDd}T00:00:00`);
  return target < today;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeCustomers(rawCustomers) {
  return rawCustomers.map((item) => {
    const purchases = Array.isArray(item.purchases) ? item.purchases : [];
    const payments = Array.isArray(item.payments) ? item.payments : [];

    return {
      id: item.id || crypto.randomUUID(),
      name: item.name || "",
      phone: item.phone || "",
      email: item.email || "",
      creditLimit: Number(item.creditLimit) || 0,
      purchases,
      payments,
      createdAt: item.createdAt || new Date().toISOString(),
    };
  });
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
}

function loadCustomers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function money(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(isoDate));
}

function formatDateOnly(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date);
}

render();
