import { initializeApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 🔥 Credenciais do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB7EGp7LZmXosM1Bm7UOpK_jyR3NKNSUPg",
  authDomain: "domus-app-b8990.firebaseapp.com",
  projectId: "domus-app-b8990",
  storageBucket: "domus-app-b8990.firebasestorage.app",
  messagingSenderId: "929577094479",
  appId: "1:929577094479:web:85ec058816142eafff893a",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Auth com persistência
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  auth = getAuth(app);
}

// Firestore
const db = getFirestore(app);

const toDateValue = (item) => {
  if (item?.localTime) return new Date(item.localTime);
  if (item?.timestamp?.toDate) return item.timestamp.toDate();
  return new Date(0);
};

const sortByDateDesc = (a, b) => toDateValue(b) - toDateValue(a);

// ========== FUNÇÕES DE AUTENTICAÇÃO ==========

// Criar conta
export const registerUser = async (
  email,
  password,
  name,
  role,
  employerEmail = "",
) => {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedEmployerEmail = employerEmail.trim().toLowerCase();
    let employerId = null;
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      normalizedEmail,
      password,
    );
    const user = userCredential.user;

    if (role === "employee") {
      if (!normalizedEmployerEmail) {
        await deleteUser(user);
        return { success: false, error: "Informe o email do empregador" };
      }

      const employerQuery = query(
        collection(db, "users"),
        where("role", "==", "employer"),
        where("email", "==", normalizedEmployerEmail),
        limit(1),
      );
      const employerSnapshot = await getDocs(employerQuery);
      if (employerSnapshot.empty) {
        await deleteUser(user);
        return { success: false, error: "Empregador não encontrado" };
      }

      employerId = employerSnapshot.docs[0].id;
    }

    const baseUserData = {
      name,
      email: normalizedEmail,
      role,
      employerId,
      employerEmail: normalizedEmployerEmail || null,
      plan: "trial",
      createdAt: serverTimestamp(),
    };

    // Salvar dados extras no Firestore
    await setDoc(doc(db, "users", user.uid), baseUserData);

    // Se for empregado, garante cadastro também na lista de funcionários do empregador
    if (role === "employee") {
      const employeeQuery = query(
        collection(db, "employees"),
        where("employerId", "==", employerId),
        where("email", "==", normalizedEmail),
        limit(1),
      );
      const employeeSnapshot = await getDocs(employeeQuery);
      if (employeeSnapshot.empty) {
        await addDoc(collection(db, "employees"), {
          employerId,
          name,
          email: normalizedEmail,
          role: "Funcionário",
          salary: 0,
          status: "active",
          hoursThisMonth: 0,
          overtimeThisMonth: 0,
          createdAt: serverTimestamp(),
        });
      }
    }

    return { success: true, user };
  } catch (error) {
    let message = "Erro ao criar conta";
    if (error.code === "auth/email-already-in-use")
      message = "Email já cadastrado";
    if (error.code === "auth/weak-password") message = "Senha muito fraca";
    if (error.code === "auth/invalid-email") message = "Email inválido";
    if (error.code === "permission-denied")
      message = "Sem permissão no banco. Verifique regras do Firestore.";
    return { success: false, error: message };
  }
};

// Login
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    return { success: true, user: userCredential.user };
  } catch (error) {
    let message = "Erro ao fazer login";
    if (error.code === "auth/user-not-found")
      message = "Usuário não encontrado";
    if (error.code === "auth/wrong-password") message = "Senha incorreta";
    if (error.code === "auth/invalid-email") message = "Email inválido";
    if (error.code === "auth/invalid-credential")
      message = "Email ou senha incorretos";
    if (error.code === "auth/too-many-requests")
      message = "Muitas tentativas. Tente novamente em alguns minutos.";
    return { success: false, error: message };
  }
};

// Logout
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Erro ao sair" };
  }
};

// Observar mudanças de autenticação
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Buscar dados do usuário
export const getUserData = async (uid) => {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() };
    }
    return { success: false, error: "Usuário não encontrado" };
  } catch (error) {
    return { success: false, error: "Erro ao buscar dados" };
  }
};

// ========== FUNÇÕES DE PONTO ==========

// Registrar ponto
export const registerCheckIn = async (userId, type, location, metadata = {}) => {
  try {
    const checkInData = {
      userId,
      type, // 'entrada' ou 'saida'
      employerId: metadata.employerId || null,
      employeeName: metadata.employeeName || null,
      timestamp: serverTimestamp(),
      localTime: new Date().toISOString(),
      latitude: location?.latitude || null,
      longitude: location?.longitude || null,
    };

    const docRef = await addDoc(collection(db, "checkins"), checkInData);
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: "Erro ao registrar ponto" };
  }
};

// Buscar pontos do usuário
export const getCheckIns = async (userId) => {
  try {
    const q = query(collection(db, "checkins"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const checkins = [];
    querySnapshot.forEach((doc) => {
      checkins.push({ id: doc.id, ...doc.data() });
    });
    checkins.sort(sortByDateDesc);
    return { success: true, data: checkins };
  } catch (error) {
    if (error.code === "permission-denied") {
      return { success: false, error: "Sem permissão para ver os registros" };
    }
    return { success: false, error: "Erro ao buscar pontos" };
  }
};

// Buscar último ponto do usuário
export const getLastCheckIn = async (userId) => {
  try {
    const q = query(collection(db, "checkins"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return { success: true, data: null };
    }
    const data = querySnapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort(sortByDateDesc);
    return { success: true, data: data[0] || null };
  } catch (error) {
    return { success: false, error: "Erro ao buscar último ponto" };
  }
};

// Buscar pontos de todos os empregados do empregador
export const getEmployerCheckIns = async (employerId) => {
  try {
    const q = query(
      collection(db, "checkins"),
      where("employerId", "==", employerId),
    );
    const querySnapshot = await getDocs(q);
    const checkins = [];
    querySnapshot.forEach((doc) => {
      checkins.push({ id: doc.id, ...doc.data() });
    });
    checkins.sort(sortByDateDesc);
    return { success: true, data: checkins };
  } catch (error) {
    if (error.code === "permission-denied") {
      return { success: false, error: "Sem permissão para ver registros da equipe" };
    }
    return { success: false, error: "Erro ao buscar registros da equipe" };
  }
};

// ========== FUNÇÕES DE EMPREGADOS ==========

// Adicionar empregado
export const addEmployee = async (employerId, employeeData) => {
  try {
    const normalizedEmail = (employeeData.email || "").trim().toLowerCase();
    if (normalizedEmail) {
      const existingQuery = query(
        collection(db, "employees"),
        where("employerId", "==", employerId),
        where("email", "==", normalizedEmail),
        limit(1),
      );
      const existingSnapshot = await getDocs(existingQuery);
      if (!existingSnapshot.empty) {
        return { success: false, error: "Funcionário já cadastrado para este empregador" };
      }
    }

    const data = {
      ...employeeData,
      email: normalizedEmail || null,
      employerId,
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, "employees"), data);
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: "Erro ao adicionar empregado" };
  }
};

// Buscar empregados
export const getEmployees = async (employerId) => {
  try {
    const q = query(
      collection(db, "employees"),
      where("employerId", "==", employerId),
    );
    const querySnapshot = await getDocs(q);
    const employees = [];
    querySnapshot.forEach((doc) => {
      employees.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: employees };
  } catch (error) {
    return { success: false, error: "Erro ao buscar empregados" };
  }
};

export { auth, db };
