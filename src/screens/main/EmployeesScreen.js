import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";
import { Colors, Shadows } from "../../theme/colors";
import { useAuth } from "../../contexts/AuthContext";
import { addEmployee, getEmployees } from "../../config/firebase";
import Input from "../../components/Input";
import Button from "../../components/Button";

export default function EmployeesScreen({ onBack }) {
  const { user, userData } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [salary, setSalary] = useState("");
  const [saving, setSaving] = useState(false);

  const loadEmployees = async () => {
    if (!user?.uid) return;
    const result = await getEmployees(user.uid);
    if (result.success) {
      setEmployees(result.data || []);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [user?.uid]);

  if (userData?.role !== "employer") {
    return (
      <View style={styles.container}>
        <Header
          title="Empregados"
          subtitle="Acesso exclusivo do empregador"
          showBack
          onBack={onBack}
        />
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed-outline" size={56} color={Colors.gray400} />
          <Text style={styles.emptyTitle}>Sem permissão</Text>
          <Text style={styles.emptySubtitle}>
            Apenas contas de empregador podem gerenciar funcionários.
          </Text>
        </View>
      </View>
    );
  }

  const handleAddEmployee = async () => {
    if (!name.trim()) {
      Alert.alert("Atenção", "Informe o nome do funcionário.");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Atenção", "Informe o e-mail do funcionário.");
      return;
    }

    setSaving(true);
    const result = await addEmployee(user.uid, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role.trim() || "Funcionário",
      salary: Number(salary) || 0,
      status: "active",
      hoursThisMonth: 0,
      overtimeThisMonth: 0,
    });
    setSaving(false);

    if (!result.success) {
      Alert.alert("Erro", result.error);
      return;
    }

    setName("");
    setEmail("");
    setRole("");
    setSalary("");
    await loadEmployees();
    Alert.alert("Sucesso", "Funcionário adicionado.");
  };

  const renderEmployee = ({ item }) => (
    <TouchableOpacity style={[styles.card, Shadows.medium]} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <LinearGradient colors={Colors.gradientTeal} style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)}
          </Text>
        </LinearGradient>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{item.name}</Text>
          <Text style={styles.employeeRole}>{item.role || "Funcionário"}</Text>
          {!!item.email && <Text style={styles.employeeEmail}>{item.email}</Text>}
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === "active" ? Colors.successSoft : Colors.gray100,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  item.status === "active" ? Colors.success : Colors.gray400,
              },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              {
                color:
                  item.status === "active" ? Colors.success : Colors.gray500,
              },
            ]}
          >
            {item.status === "active" ? "Ativo" : "Inativo"}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            R${" "}
            {(item.salary || 0).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
          </Text>
          <Text style={styles.statLabel}>Salário</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.hoursThisMonth || 0}h</Text>
          <Text style={styles.statLabel}>Horas/mês</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: Colors.orange }]}>
            {item.overtimeThisMonth || 0}h
          </Text>
          <Text style={styles.statLabel}>Extras</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header
        title="Empregados"
        subtitle="Gerenciar funcionários"
        showBack
        onBack={onBack}
      />

      <View style={styles.formBox}>
        <Input
          label="Nome do funcionário"
          value={name}
          onChangeText={setName}
          placeholder="Ex.: Maria Souza"
          icon="person-outline"
        />
        <Input
          label="E-mail do funcionário"
          value={email}
          onChangeText={setEmail}
          placeholder="funcionario@email.com"
          keyboardType="email-address"
          icon="mail-outline"
        />
        <Input
          label="Função"
          value={role}
          onChangeText={setRole}
          placeholder="Ex.: Babá"
          icon="briefcase-outline"
        />
        <Input
          label="Salário"
          value={salary}
          onChangeText={setSalary}
          placeholder="Ex.: 1800"
          keyboardType="numeric"
          icon="cash-outline"
        />
        <Button
          title="Adicionar funcionário"
          icon="add"
          onPress={handleAddEmployee}
          loading={saving}
        />
      </View>

      <FlatList
        data={employees}
        renderItem={renderEmployee}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={Colors.gray300} />
            <Text style={styles.emptyTitle}>Nenhum empregado</Text>
            <Text style={styles.emptySubtitle}>
              Nenhum funcionário encontrado para esta conta
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  formBox: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.white,
  },
  employeeInfo: { flex: 1, marginLeft: 14 },
  employeeName: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  employeeRole: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  employeeEmail: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: "600" },
  statsRow: {
    flexDirection: "row",
    backgroundColor: Colors.gray50,
    borderRadius: 14,
    padding: 14,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  statDivider: {
    width: 1,
    backgroundColor: Colors.gray200,
    marginVertical: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
});
