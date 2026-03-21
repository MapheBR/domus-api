import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";
import { Colors, Shadows } from "../../theme/colors";
import { useAuth } from "../../contexts/AuthContext";
import { getCheckIns, getEmployerCheckIns } from "../../config/firebase";

const monthKey = (date) => `${date.getFullYear()}-${date.getMonth() + 1}`;

export default function ReportsScreen({ onBack }) {
  const { user, userData } = useAuth();
  const [records, setRecords] = useState([]);
  const isEmployer = userData?.role === "employer";

  useEffect(() => {
    let active = true;

    (async () => {
      if (!user?.uid) return;
      const result = isEmployer
        ? await getEmployerCheckIns(user.uid)
        : await getCheckIns(user.uid);
      if (active && result.success) {
        setRecords(result.data || []);
      }
    })();

    return () => {
      active = false;
    };
  }, [user?.uid, isEmployer]);

  const stats = useMemo(() => {
    const now = new Date();
    const key = monthKey(now);
    const thisMonth = records.filter((r) => {
      const d = r?.localTime ? new Date(r.localTime) : r?.timestamp?.toDate?.();
      return d && monthKey(d) === key;
    });

    const entradas = thisMonth.filter((r) => r.type === "entrada").length;
    const saidas = thisMonth.filter((r) => r.type === "saida").length;
    const colaboradores = new Set(
      thisMonth.map((r) => r.employeeName).filter(Boolean),
    ).size;

    return {
      total: thisMonth.length,
      entradas,
      saidas,
      colaboradores,
    };
  }, [records]);

  return (
    <View style={styles.container}>
      <Header
        title="Relatórios"
        subtitle={isEmployer ? "Resumo da equipe" : "Meu resumo mensal"}
        showBack
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, Shadows.small]}>
          <Text style={styles.cardTitle}>Resumo do mês</Text>
          <View style={styles.grid}>
            <View style={styles.item}>
              <Ionicons name="time-outline" size={20} color={Colors.teal} />
              <Text style={styles.value}>{stats.total}</Text>
              <Text style={styles.label}>Registros</Text>
            </View>
            <View style={styles.item}>
              <Ionicons name="log-in-outline" size={20} color={Colors.success} />
              <Text style={styles.value}>{stats.entradas}</Text>
              <Text style={styles.label}>Entradas</Text>
            </View>
            <View style={styles.item}>
              <Ionicons name="log-out-outline" size={20} color={Colors.error} />
              <Text style={styles.value}>{stats.saidas}</Text>
              <Text style={styles.label}>Saídas</Text>
            </View>
            <View style={styles.item}>
              <Ionicons name="people-outline" size={20} color={Colors.orange} />
              <Text style={styles.value}>
                {isEmployer ? stats.colaboradores : 1}
              </Text>
              <Text style={styles.label}>
                {isEmployer ? "Colaboradores" : "Usuário"}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  item: {
    width: "48%",
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    padding: 12,
  },
  value: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
