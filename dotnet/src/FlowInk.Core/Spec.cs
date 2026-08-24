using System.Text.Json;
using System.Text.Json.Serialization;

namespace FlowInk.Core;

/// <summary>Root FlowSpec document — mirrors the TypeScript schema exactly.</summary>
public sealed class FlowSpec
{
    [JsonPropertyName("title")] public string Title { get; set; } = "";
    [JsonPropertyName("subtitle")] public string? Subtitle { get; set; }
    [JsonPropertyName("width")] public int? Width { get; set; }
    [JsonPropertyName("height")] public int? Height { get; set; }
    [JsonPropertyName("theme")] public string? Theme { get; set; }
    [JsonPropertyName("chip")] public string? Chip { get; set; }
    [JsonPropertyName("nodes")] public List<FlowNode> Nodes { get; set; } = [];
    [JsonPropertyName("edges")] public List<FlowEdge> Edges { get; set; } = [];
}

public sealed class FlowNode
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("label")] public string Label { get; set; } = "";
    [JsonPropertyName("lines")] public List<string>? Lines { get; set; }
    [JsonPropertyName("x")] public int X { get; set; }
    [JsonPropertyName("y")] public int Y { get; set; }
    [JsonPropertyName("width")] public int? Width { get; set; }
    [JsonPropertyName("height")] public int? Height { get; set; }
    [JsonPropertyName("pulse")] public JsonElement? Pulse { get; set; }

    public bool PulseIsBool(out bool value)
    {
        value = false;
        return Pulse is { ValueKind: JsonValueKind.True or JsonValueKind.False } &&
               (value = Pulse.Value.GetBoolean());
    }

    public int? PulseDurationMs() =>
        Pulse is { ValueKind: JsonValueKind.Number } ? (int)Pulse.Value.GetDouble() : null;
}

public sealed class FlowEdge
{
    [JsonPropertyName("from")] public string From { get; set; } = "";
    [JsonPropertyName("to")] public string To { get; set; } = "";
    [JsonPropertyName("label")] public string? Label { get; set; }
    [JsonPropertyName("color")] public string? Color { get; set; }
    [JsonPropertyName("direction")] public string? Direction { get; set; }
    [JsonPropertyName("packet")] public bool Packet { get; set; }
    [JsonPropertyName("path")] public string? Path { get; set; }
}
