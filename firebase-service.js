import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAP8BZ8MRBIR4OfdTM4shp24qumZdZVF1A",
  authDomain: "brewers-pdv-e5886.firebaseapp.com",
  projectId: "brewers-pdv-e5886",
  storageBucket: "brewers-pdv-e5886.firebasestorage.app",
  messagingSenderId: "43541055382",
  appId: "1:43541055382:web:94abd22fb62941b9783fb7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* =========================
   PRODUTOS
========================= */

export async function getProducts() {
  const snapshot = await getDocs(collection(db, "products"));

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data()
  }));
}

export async function saveProduct(product) {
  if (!product.id) {
    throw new Error("Produto sem ID.");
  }

  const productId = String(product.id);

  const productData = {
    nome: product.nome || "",
    categoria: product.categoria || "",
    descricao: product.descricao || "",
    preco: Number(product.preco || 0),
    tamanho: product.tamanho || "",
    opcoes: Array.isArray(product.opcoes) ? product.opcoes : [],
    imagem: product.imagem || "assets/logo-brewers.svg",
    frame: product.frame || "",
    active: product.active !== false
  };

  await setDoc(doc(db, "products", productId), productData, { merge: true });

  return {
    id: productId,
    ...productData
  };
}

/* =========================
   MESAS
========================= */

export async function getTables() {
  const snapshot = await getDocs(collection(db, "tables"));

  return snapshot.docs
    .map((docItem) => ({
      id: docItem.id,
      ...docItem.data()
    }))
    .sort((a, b) => Number(a.numero || 0) - Number(b.numero || 0));
}

export async function saveTable(tableName) {
  const numero = Number(String(tableName).match(/\d+/)?.[0] || 0);
  const tableId = numero ? `mesa-${numero}` : tableName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const tableData = {
    nome: tableName,
    numero,
    active: true
  };

  await setDoc(doc(db, "tables", tableId), tableData, { merge: true });

  return {
    id: tableId,
    ...tableData
  };
}

export async function deleteTable(tableId) {
  await deleteDoc(doc(db, "tables", String(tableId)));
}

/* =========================
   CLIENTES
========================= */

export async function getClients() {
  const snapshot = await getDocs(collection(db, "clients"));

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data()
  }));
}

export async function createClient(client) {
  const clientData = {
    nome: client.nome || "",
    cpf: client.cpf || "",
    celular: client.celular || "",
    nascimento: client.nascimento || "",
    endereco: client.endereco || ""
  };

  const docRef = await addDoc(collection(db, "clients"), clientData);

  return {
    id: docRef.id,
    ...clientData
  };
}

export async function deleteClient(clientId) {
  await deleteDoc(doc(db, "clients", String(clientId)));
}

/* =========================
   CAIXA
========================= */

export async function getCash() {
  const snapshot = await getDoc(doc(db, "cash", "state"));

  if (!snapshot.exists()) {
    return {
      is_open: false,
      balance: 0,
      updated_at: null
    };
  }

  return snapshot.data();
}

export async function openCash(balance) {
  const cashData = {
    is_open: true,
    balance: Number(balance || 0),
    updated_at: new Date().toISOString()
  };

  await setDoc(doc(db, "cash", "state"), cashData, { merge: true });

  return cashData;
}

export async function closeCash() {
  const cashData = {
    is_open: false,
    updated_at: new Date().toISOString()
  };

  await setDoc(doc(db, "cash", "state"), cashData, { merge: true });

  return cashData;
}

/* =========================
   PEDIDOS
========================= */

export function listenOrders(callback) {
  const ordersQuery = query(
    collection(db, "orders"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(ordersQuery, (snapshot) => {
    const orders = snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data()
    }));

    callback(orders);
  });
}

export async function createOrder(order) {
  const orderData = {
    mesa: order.mesa || order.table || "Mesa 1",
    table: order.table || order.mesa || "Mesa 1",
    status: order.status || "Novo",
    hora: order.hora || new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    }),
    subtotal: Number(order.subtotal || 0),
    service: Number(order.service || 0),
    total: Number(order.total || 0),
    notes: order.notes || "",
    payment: order.payment || "",
    client: order.client || null,
    items: Array.isArray(order.items) ? order.items : [],
    createdAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, "orders"), orderData);

  return {
    id: docRef.id,
    ...orderData
  };
}

export async function updateOrderStatus(orderId, status) {
  await updateDoc(doc(db, "orders", String(orderId)), {
    status
  });
}

export async function updateOrder(orderId, orderData) {
  await updateDoc(doc(db, "orders", String(orderId)), orderData);
}