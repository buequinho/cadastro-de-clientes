const STORAGE_KEY = "clientes-loja-roupas-v1";

const form = document.getElementById("customer-form");
const list = document.getElementById("customers-list");
const search = document.getElementById("search");
const template = document.getElementById("customer-template");

let customers = loadCustomers();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const customer = {
    id: crypto.randomUUID(),
    name: document.getElementById("name").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    email: document.getElementById("email").value.trim(),
    creditLimit: Number(document.getElementById("limit").value) || 0,
    debt: 0,
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
    const fragment = template.content.cloneNode(true);
    const item = fragment.querySelector(".customer-item");

    fragment.querySelector(".customer-name").textContent = customer.name;
    fragment.querySelector(".customer-contact").textContent = `${customer.phone}${
      customer.email ? ` • ${customer.email}` : ""
    }`;
    fragment.querySelector(".customer-credit").textContent = `Limite: ${money(
      customer.creditLimit
    )}`;
    fragment.querySelector(".customer-debt").textContent = `Débito atual: ${money(
      customer.debt
    )}`;

    const badge = fragment.querySelector(".badge");
    const usage = customer.creditLimit
      ? Math.min((customer.debt / customer.creditLimit) * 100, 999)
      : 0;
    if (usage < 75) {
      badge.className = "badge ok";
      badge.textContent = "Em dia";
    } else {
      badge.className = "badge alert";
      badge.textContent = "Atenção";
    }

    const historyList = fragment.querySelector(".history ul");
    if (!customer.payments.length) {
      const li = document.createElement("li");
      li.textContent = "Sem pagamentos registrados.";
      historyList.appendChild(li);
    } else {
      customer.payments.forEach((payment) => {
        const li = document.createElement("li");
        li.textContent = `${formatDate(payment.date)} — ${money(payment.amount)}`;
        historyList.appendChild(li);
      });
    }

    const paymentForm = fragment.querySelector(".payment-form");
    paymentForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const amountInput = paymentForm.querySelector("input");
      const amount = Number(amountInput.value);

      if (!amount || amount <= 0) {
        return;
      }

      const index = customers.findIndex((entry) => entry.id === customer.id);
      if (index === -1) {
        return;
      }

      customers[index].debt = Math.max(customers[index].debt - amount, 0);
      customers[index].payments.unshift({
        amount,
        date: new Date().toISOString(),
      });
      persist();
      render();
    });

    const deleteBtn = fragment.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", () => {
      customers = customers.filter((entry) => entry.id !== customer.id);
      persist();
      render();
    });

    item.addEventListener("dblclick", () => {
      const value = window.prompt(
        "Adicionar compra no fiado (R$):",
        "0"
      );
      const purchase = Number(value);
      if (!purchase || purchase <= 0) {
        return;
      }
      const index = customers.findIndex((entry) => entry.id === customer.id);
      if (index === -1) {
        return;
      }
      customers[index].debt += purchase;
      persist();
      render();
    });

    list.appendChild(fragment);
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

render();
