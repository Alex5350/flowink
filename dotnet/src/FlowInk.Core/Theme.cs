namespace FlowInk.Core;

/// <summary>Theme tokens — mirrors theme.ts. Dark is the showcase default.</summary>
public sealed record Theme(
    string Canvas,
    string Dot,
    string NodeFill,
    string NodeStroke,
    string Title,
    string Subtitle,
    string NodeText,
    string BodyText,
    string Label,
    string Edge,
    string ChipStroke,
    string Sky,
    string Emerald,
    string Amber,
    string Rose,
    string Packet)
{
    public string Flow(string name) => name switch
    {
        "emerald" => Emerald,
        "amber" => Amber,
        "rose" => Rose,
        _ => Sky,
    };

    public static Theme Dark { get; } = new(
        Canvas: "#0B1118", Dot: "#1B2737", NodeFill: "#0E1620", NodeStroke: "#22304A",
        Title: "#E2E8F0", Subtitle: "#64748B", NodeText: "#E2E8F0", BodyText: "#94A3B8",
        Label: "#64748B", Edge: "#1F2B3D", ChipStroke: "#38BDF8",
        Sky: "#38BDF8", Emerald: "#34D399", Amber: "#F59E0B", Rose: "#F87171",
        Packet: "#7DD3FC");

    public static Theme Light { get; } = new(
        Canvas: "#F8FAFC", Dot: "#E2E8F0", NodeFill: "#FFFFFF", NodeStroke: "#CBD5E1",
        Title: "#0F172A", Subtitle: "#64748B", NodeText: "#0F172A", BodyText: "#475569",
        Label: "#64748B", Edge: "#CBD5E1", ChipStroke: "#0284C7",
        Sky: "#0284C7", Emerald: "#059669", Amber: "#D97706", Rose: "#DC2626",
        Packet: "#0EA5E9");
}
