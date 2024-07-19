const API = (() => {
  const URL = "http://localhost:3000";

  const getCart = () => fetch(`${URL}/cart`).then(res => res.json());

  const getInventory = () => fetch(`${URL}/inventory`).then(res => res.json());

  const addToCart = (inventoryItem) => fetch(`${URL}/cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inventoryItem)
  }).then(res => res.json());

  const updateCart = (id, newAmount) => fetch(`${URL}/cart/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: newAmount })
  }).then(res => res.json());

  const deleteFromCart = (id) => fetch(`${URL}/cart/${id}`, {
    method: 'DELETE'
  }).then(res => res.json());

  const checkout = () => getCart().then(cartItems => 
    Promise.all(cartItems.map(item => deleteFromCart(item.id)))
  );

  return { getCart, getInventory, addToCart, updateCart, deleteFromCart, checkout };
})();

const Model = (() => {
  class State {
    #onChange;
    #inventory = [];
    #cart = [];

    get cart() { return this.#cart; }
    get inventory() { return this.#inventory; }

    set cart(newCart) { 
      this.#cart = newCart; 
      this.#onChange?.(); 
    }

    set inventory(newInventory) { 
      this.#inventory = newInventory; 
      this.#onChange?.(); 
    }

    subscribe(callback) { this.#onChange = callback; }
  }

  const { getCart, getInventory, addToCart, updateCart, deleteFromCart, checkout } = API;

  return { State, getCart, getInventory, addToCart, updateCart, deleteFromCart, checkout };
})();

const View = (() => {
  const inventoryContainer = document.querySelector('.inventory-container ul');
  const cartContainer = document.querySelector('.cart-container ul');
  const checkoutButton = document.querySelector('.checkout-btn');

  const renderInventory = (inventory) => {
    inventoryContainer.innerHTML = '';
    inventory.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `
        ${item.content} 
        <button class="minus-btn" data-id="${item.id}">-</button>
        <span class="num1" id="amount-${item.id}">1</span>
        <button class="plus-btn" data-id="${item.id}">+</button>
        <button class="add-btn" data-id="${item.id}">add to cart</button>
      `;
      inventoryContainer.appendChild(li);
    });
  };

  const renderCart = (cart) => {
    cartContainer.innerHTML = '';
    cart.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `
        ${item.content} x ${item.amount}
        <button class="delete-btn" data-id="${item.id}">delete</button>
      `;
      cartContainer.appendChild(li);
    });
  };

  return { renderInventory, renderCart, checkoutButton };
})();

const Controller = ((model, view) => {
  const state = new model.State();

  const init = () => {
    model.getInventory().then(data => state.inventory = data);
    model.getCart().then(data => state.cart = data);
  };

  const handleUpdateAmount = (id, change) => {
    const amountElement = document.getElementById(`amount-${id}`);
    let amount = parseInt(amountElement.textContent);
    amount = amount + change;
    if (amount < 1) amount = 1;
    amountElement.textContent = amount;
  };

  const handleAddToCart = (id) => {
    const amount = parseInt(document.getElementById(`amount-${id}`).textContent);
    if (amount === 0) return;

    const item = state.inventory.find(item => item.id === id);
    const cartItem = state.cart.find(item => item.id === id);

    if (cartItem) {
      model.updateCart(id, cartItem.amount + amount).then(() => {
        state.cart = state.cart.map(item => item.id === id ? { ...item, amount: item.amount + amount } : item);
      });
    } else {
      model.addToCart({ ...item, amount }).then(() => {
        state.cart = [...state.cart, { ...item, amount }];
      });
    }
  };

  const handleDelete = (id) => {
    model.deleteFromCart(id).then(() => {
      state.cart = state.cart.filter(item => item.id !== id);
    });
  };

  const handleCheckout = () => {
    model.checkout().then(() => state.cart = []);
  };

  const bootstrap = () => {
    state.subscribe(() => {
      view.renderInventory(state.inventory);
      view.renderCart(state.cart);
    });

    init();

    document.body.addEventListener('click', (event) => {
      if (event.target.classList.contains('plus-btn')) {
        const id = parseInt(event.target.getAttribute('data-id'));
        handleUpdateAmount(id, 1);
      } else if (event.target.classList.contains('minus-btn')) {
        const id = parseInt(event.target.getAttribute('data-id'));
        handleUpdateAmount(id, -1);
      } else if (event.target.classList.contains('add-btn')) {
        const id = parseInt(event.target.getAttribute('data-id'));
        handleAddToCart(id);
      } else if (event.target.classList.contains('delete-btn')) {
        const id = parseInt(event.target.getAttribute('data-id'));
        handleDelete(id);
      }
    });

    view.checkoutButton.addEventListener('click', handleCheckout);
  };

  return { bootstrap };
})(Model, View);

Controller.bootstrap();
