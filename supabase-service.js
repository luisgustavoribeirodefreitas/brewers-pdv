import { createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://kicsxisicdvdsurrcxvz.supabase.co";

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpY3N4aXNpY2R2ZHN1cnJjeHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5Njg5MTcsImV4cCI6MjA5NjU0NDkxN30.qO671Qw3ILnO3onTePevXXcSWFJDv8qMXrhMBUDJQJg";

const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(String(password || ""));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/* =========================
   FUNCIONÁRIOS
========================= */

export async function loginStaffUserSupabase(username, password) {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  const { data: user, error } = await supabase
    .from("staff_users")
    .select("*")
    .eq("username", normalizedUsername)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!user || user.password_hash !== passwordHash) {
    throw new Error("Usuário ou senha inválidos.");
  }

  return {
    id: user.id,
    username: user.username,
    firstName: user.first_name || "",
    lastName: user.last_name || "",
    authorizedBy: user.authorized_by || "",
    subtitle: user.authorized_by
      ? `Autorizado por ${user.authorized_by}`
      : "Equipe Brewers"
  };
}

export async function registerStaffUserSupabase({
  username,
  password,
  firstName,
  lastName,
  authorizedBy
}) {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  const userData = {
    id: crypto.randomUUID(),
    username: normalizedUsername,
    password_hash: passwordHash,
    first_name: firstName || "",
    last_name: lastName || "",
    authorized_by: authorizedBy || "",
    created_at: new Date().toISOString()
  };

  const { data: existingUser, error: existingError } = await supabase
    .from("staff_users")
    .select("id")
    .eq("username", normalizedUsername)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingUser) {
    throw new Error("Usuário já cadastrado.");
  }

  const { data: createdUser, error } = await supabase
    .from("staff_users")
    .insert(userData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    id: createdUser.id,
    username: createdUser.username,
    firstName: createdUser.first_name || "",
    lastName: createdUser.last_name || "",
    authorizedBy: createdUser.authorized_by || "",
    subtitle: createdUser.authorized_by
      ? `Autorizado por ${createdUser.authorized_by}`
      : "Equipe Brewers"
  };
}

/* =========================
   PRODUTOS
========================= */

export async function getProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("categoria", { ascending: true })
    .order("nome", { ascending: true });

  if (error) throw error;

  return data || [];
}

export async function uploadProductImage(file) {
  if (!file) {
    return null;
  }

  const extension = file.name.split(".").pop() || "png";
  const fileName = `${Date.now()}-${slugify(file.name)}.${extension}`;
  const filePath = `products/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from("product-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function saveProduct(product) {
  const productId = product.id || slugify(product.nome);

  if (!productId) {
    throw new Error("Produto sem ID ou nome.");
  }

  const productData = {
    id: productId,
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

  const { data, error } = await supabase
    .from("products")
    .upsert(productData, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteProduct(productId) {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) throw error;

  return true;
}

/* =========================
   MESAS
========================= */

export async function getTables() {
  const { data, error } = await supabase
    .from("tables")
    .select("*")
    .eq("active", true)
    .order("numero", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function saveTable(tableName) {
  const numero = Number(String(tableName).match(/\d+/)?.[0] || 0);
  const tableId = numero ? `mesa-${numero}` : slugify(tableName);

  const tableData = {
    id: tableId,
    nome: tableName,
    numero,
    active: true
  };

  const { data, error } = await supabase
    .from("tables")
    .upsert(tableData, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteTable(tableId) {
  const { error } = await supabase
    .from("tables")
    .update({ active: false })
    .eq("id", String(tableId));

  if (error) {
    throw error;
  }
}

/* =========================
   CLIENTES
========================= */

export async function getClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function createClient(client) {
  const clientData = {
    id: client.id || crypto.randomUUID(),
    nome: client.nome || "",
    cpf: client.cpf || "",
    celular: client.celular || "",
    nascimento: client.nascimento || "",
    endereco: client.endereco || ""
  };

  const { data, error } = await supabase
    .from("clients")
    .upsert(clientData, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteClient(clientId) {
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", String(clientId));

  if (error) {
    throw error;
  }
}

/* =========================
   CAIXA
========================= */

export async function getCash() {
  const { data, error } = await supabase
    .from("cash_state")
    .select("*")
    .eq("id", "state")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function openCash(balance) {
  const cashData = {
    id: "state",
    is_open: true,
    balance: Number(balance || 0),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("cash_state")
    .upsert(cashData, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function closeCash() {
  const cashData = {
    id: "state",
    is_open: false,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("cash_state")
    .upsert(cashData, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/* =========================
   PEDIDOS
========================= */

function normalizeOrder(order, items = []) {
  return {
    id: order.id,
    numero: order.numero,
    mesa: order.mesa,
    table: order.mesa,
    status: order.status,
    hora: order.hora,
    subtotal: Number(order.subtotal || 0),
    service: Number(order.service || 0),
    total: Number(order.total || 0),
    notes: order.notes || "",
    payment: order.payment || "",
    paymentMethod: order.payment || "",
    is_paid: Boolean(order.is_paid),
    isPaid: Boolean(order.is_paid),
    paid_at: order.paid_at || null,
    paidAt: order.paid_at || null,
    client: order.client || null,
    createdAt: order.created_at,
    created_at: order.created_at,
    items
  };
}

export async function getOrders() {
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (ordersError) {
    throw ordersError;
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*");

  if (itemsError) {
    throw itemsError;
  }

  return (orders || []).map((order) => {
    const orderItems = (items || []).filter((item) => item.order_id === order.id);
    return normalizeOrder(order, orderItems);
  });
}

export function listenOrders(callback) {
  let active = true;

  async function refreshOrders() {
    if (!active) return;

    try {
      const orders = await getOrders();
      callback(orders);
    } catch (error) {
      console.error("Erro ao atualizar pedidos:", error);
    }
  }

  refreshOrders();

  const channel = supabase
    .channel(`orders-realtime-${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      refreshOrders
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "order_items" },
      refreshOrders
    );

  channel.subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

export async function createOrder(order) {
  const orderId = order.id || crypto.randomUUID();

  const orderData = {
  id: orderId,
  mesa: order.mesa ?? order.table ?? "",
  status: order.status || "Novo",
  hora:
    order.hora ||
    new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    }),
  subtotal: Number(order.subtotal || 0),
  service: Number(order.service || 0),
  total: Number(order.total || 0),
  notes: order.notes || "",
  payment: order.payment || "",
  is_paid: Boolean(order.is_paid ?? order.isPaid ?? false),
  paid_at: Boolean(order.is_paid ?? order.isPaid ?? false)
    ? new Date().toISOString()
    : null,
  client: order.client || null,
  created_at: new Date().toISOString()
  };

  const { data: savedOrder, error: orderError } = await supabase
    .from("orders")
    .insert(orderData)
    .select()
    .single();

  if (orderError) {
    throw orderError;
  }

  const items = Array.isArray(order.items) ? order.items : [];

  if (items.length) {
    const orderItems = items.map((item) => ({
      id: crypto.randomUUID(),
      order_id: orderId,
      product_id: item.product_id || item.productId || item.id || "",
      nome: item.nome || item.name || "",
      option: item.option || item.opcao || "",
      quantity: Number(item.quantity || item.quantidade || 1),
      unit_price: Number(item.unit_price || item.unitPrice || item.preco || 0),
      notes: item.notes || ""
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      throw itemsError;
    }
  }

  return normalizeOrder(savedOrder, items);
}

export async function updateOrderStatus(orderId, status) {
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", String(orderId));

  if (error) {
    throw error;
  }
}

export async function updateOrder(orderId, orderData) {
  const orderFields = {};

  if ("mesa" in orderData || "table" in orderData) {
    orderFields.mesa = orderData.mesa || orderData.table;
  }

  if ("status" in orderData) orderFields.status = orderData.status;
  if ("hora" in orderData) orderFields.hora = orderData.hora;
  if ("subtotal" in orderData) orderFields.subtotal = Number(orderData.subtotal || 0);
  if ("service" in orderData) orderFields.service = Number(orderData.service || 0);
  if ("total" in orderData) orderFields.total = Number(orderData.total || 0);
  if ("notes" in orderData) orderFields.notes = orderData.notes || "";
  if ("payment" in orderData) orderFields.payment = orderData.payment || "";
  if ("is_paid" in orderData || "isPaid" in orderData) {
  const isPaid = Boolean(orderData.is_paid ?? orderData.isPaid);

  orderFields.is_paid = isPaid;
  orderFields.paid_at = isPaid
    ? (orderData.paid_at || orderData.paidAt || new Date().toISOString())
    : null;
  }
  if ("client" in orderData) orderFields.client = orderData.client || null;

  if (Object.keys(orderFields).length) {
    const { error } = await supabase
      .from("orders")
      .update(orderFields)
      .eq("id", String(orderId));

    if (error) {
      throw error;
    }
  }

  if (Array.isArray(orderData.items)) {
    const { error: deleteError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", String(orderId));

    if (deleteError) {
      throw deleteError;
    }

    if (orderData.items.length) {
      const newItems = orderData.items.map((item) => ({
        id: crypto.randomUUID(),
        order_id: String(orderId),
        product_id: item.product_id || item.productId || item.id || "",
        nome: item.nome || item.name || "",
        option: item.option || item.opcao || "",
        quantity: Number(item.quantity || item.quantidade || 1),
        unit_price: Number(item.unit_price || item.unitPrice || item.preco || 0),
        notes: item.notes || ""
      }));

      const { error: insertError } = await supabase
        .from("order_items")
        .insert(newItems);

      if (insertError) {
        throw insertError;
      }
    }
  }
}

export async function updateOrderItems(orderId, items, subtotal, service, total) {
  await updateOrder(orderId, {
    items,
    subtotal,
    service,
    total
  });
}