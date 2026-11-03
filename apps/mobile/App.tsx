import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function App() {
  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.brand}>GLAM AI · Development</Text>
    <Text accessibilityRole="header" style={styles.title}>Your look. Your way.</Text>
    <Text style={styles.body}>Beauty, African hair and personal style — from inspiration to real-world possibilities.</Text>
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.heading}>Foundations in progress</Text>
      <Text style={styles.body}>AI analysis, shopping and bookings are not available yet. This app does not collect facial images or payments.</Text>
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40, backgroundColor: "#fff9f3" },
  brand: { color: "#704058", fontSize: 16, fontWeight: "700" },
  title: { color: "#24172a", fontSize: 48, fontWeight: "700", marginTop: 40, marginBottom: 24 },
  body: { color: "#24172a", fontSize: 18, lineHeight: 29 },
  card: { marginTop: 40, padding: 24, backgroundColor: "#fff", borderColor: "#dac9cf", borderWidth: 1, borderRadius: 16 },
  heading: { fontSize: 22, fontWeight: "600", color: "#24172a", marginBottom: 12 }
});
