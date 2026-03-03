const STORAGE_KEY = "clientes-loja-roupas-v3";

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
  purchaseForm.querySelector(".purchase-first-due").value = todayISO();

  purchaseForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const amount = Number(purchaseForm.querySelector(".purchase-amount").value);
    const date = purchaseForm.querySelector(".purchase-date").value;
    const paymentType = purchaseForm.querySelector(".purchase-type").value;
    const installments = Number(purchaseForm.querySelector(".purchase-installments").value);
    const firstDueDate = purchaseForm.querySelector(".purchase-first-due").value;

    if (!amount || amount <= 0 || !date || !paymentType || !installments || installments < 1 || !firstDueDate) {
      return;
    }

    const index = customers.findIndex((entry) => entry.id === customer.id);
    if (index === -1) return;

    const purchaseInstallments = generateInstallments(amount, installments, firstDueDate);

    customers[index].purchases.unshift({
      id: crypto.randomUUID(),
      amount,
      date,
      paymentType,
      installments: purchaseInstallments,
    });

    persist();
    render();
  });
}

function bindPaymentForm(fragment, customer) {
  const paymentForm = fragment.querySelector(".payment-form");
  paymentForm.querySelector(".payment-date").value = todayISO();

  paymentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = Number(paymentForm.querySelector(".payment-amount").value);
    const date = paymentForm.querySelector(".payment-date").value;
    const paymentType = paymentForm.querySelector(".payment-type").value;

    if (!amount || amount <= 0 || !date || !paymentType) return;

    const index = customers.findIndex((entry) => entry.id === customer.id);
    if (index === -1) return;

    customers[index].payments.unshift({
      id: crypto.randomUUID(),
      amount,
      date,
      paymentType,
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
  const paymentApplied = getPaymentAllocation(customer);

  if (!customer.purchases.length) {
    const li = document.createElement("li");
    li.textContent = "Sem compras registradas.";
    ul.appendChild(li);
    return;
  }

  customer.purchases.forEach((purchase) => {
    const li = document.createElement("li");
    const installmentLines = purchase.installments
      .map((installment) => {
        const paidPart = paymentApplied.byInstallmentId[installment.id] || 0;
        const pending = Math.max(installment.amount - paidPart, 0);
        const overdue = pending > 0 && isPastDate(installment.dueDate);
        return `${installment.number}/${installment.total}: ${money(installment.amount)} | aberto ${money(
          pending
        )} | vence ${formatDateOnly(installment.dueDate)}${overdue ? " (ATRASADO)" : ""}`;
      })
      .join(" • ");

    li.textContent = `${formatDateOnly(purchase.date)} | ${money(purchase.amount)} | ${labelPaymentType(
      purchase.paymentType
    )} | Parcelas: ${installmentLines}`;
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
    li.textContent = `${formatDateOnly(payment.date)} — ${money(payment.amount)} (${labelPaymentType(
      payment.paymentType
    )})`;
    ul.appendChild(li);
  });
}

function getTotals(customer) {
  const allInstallments = getAllInstallments(customer);
  const totalPurchases = allInstallments.reduce((acc, item) => acc + item.amount, 0);
  const totalPayments = customer.payments.reduce((acc, item) => acc + item.amount, 0);
  const outstanding = Math.max(totalPurchases - totalPayments, 0);

  const allocation = getPaymentAllocation(customer);
  const overdue = allInstallments.reduce((acc, installment) => {
    const paid = allocation.byInstallmentId[installment.id] || 0;
    const pending = Math.max(installment.amount - paid, 0);
    if (pending > 0 && isPastDate(installment.dueDate)) {
      return acc + pending;
    }
    return acc;
  }, 0);

  return { totalPurchases, totalPayments, outstanding, overdue };
}

function getPaymentAllocation(customer) {
  const installments = getAllInstallments(customer).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  const payments = [...customer.payments].sort((a, b) => (a.date < b.date ? -1 : 1));
  let remainingPayment = payments.reduce((acc, item) => acc + item.amount, 0);
  const byInstallmentId = {};

  installments.forEach((installment) => {
    if (remainingPayment <= 0) {
      byInstallmentId[installment.id] = 0;
      return;
    }
    const paid = Math.min(installment.amount, remainingPayment);
    byInstallmentId[installment.id] = paid;
    remainingPayment -= paid;
  });

  return { byInstallmentId };
}

function getAllInstallments(customer) {
  return customer.purchases.flatMap((purchase) => {
    if (Array.isArray(purchase.installments) && purchase.installments.length) {
      return purchase.installments;
    }

    const fallbackInstallment = {
      id: `${purchase.id || crypto.randomUUID()}-1`,
      number: 1,
      total: 1,
      amount: Number(purchase.amount) || 0,
      dueDate: purchase.dueDate || purchase.date || todayISO(),
    };
    return [fallbackInstallment];
  });
}

function generateInstallments(totalAmount, count, firstDueDate) {
  const installments = [];
  const baseAmount = Math.floor((totalAmount / count) * 100) / 100;
  let accumulated = 0;

  for (let i = 1; i <= count; i += 1) {
    const amount = i === count ? roundCurrency(totalAmount - accumulated) : baseAmount;
    accumulated = roundCurrency(accumulated + amount);
    installments.push({
      id: crypto.randomUUID(),
      number: i,
      total: count,
      amount,
      dueDate: addMonthsToDate(firstDueDate, i - 1),
    });
  }

  return installments;
}

function addMonthsToDate(yyyyMmDd, months) {
  const [year, month, day] = yyyyMmDd.split("-").map(Number);
  const date = new Date(year, month - 1 + months, day);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
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

function labelPaymentType(type) {
  if (type === "cartao") return "Cartão";
  if (type === "dinheiro") return "Dinheiro";
  if (type === "pix") return "PIX";
  return "Não informado";
}

function normalizeCustomers(rawCustomers) {
  return rawCustomers.map((item) => {
    const purchases = Array.isArray(item.purchases)
      ? item.purchases.map((purchase) => {
          const installments = Array.isArray(purchase.installments)
            ? purchase.installments
            : [
                {
                  id: `${purchase.id || crypto.randomUUID()}-1`,
                  number: 1,
                  total: 1,
                  amount: Number(purchase.amount) || 0,
                  dueDate: purchase.dueDate || purchase.date || todayISO(),
                },
              ];
          return {
            id: purchase.id || crypto.randomUUID(),
            amount: Number(purchase.amount) || installments.reduce((acc, ins) => acc + (Number(ins.amount) || 0), 0),
            date: purchase.date || todayISO(),
            paymentType: purchase.paymentType || "cartao",
            installments,
          };
        })
      : [];

    const payments = Array.isArray(item.payments)
      ? item.payments.map((payment) => ({
          id: payment.id || crypto.randomUUID(),
          amount: Number(payment.amount) || 0,
          date: payment.date || todayISO(),
          paymentType: payment.paymentType || "dinheiro",
        }))
      : [];

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

function formatDateOnly(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date);
}

render();
