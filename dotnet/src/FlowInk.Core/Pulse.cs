using System.Text.Json;
using System.Text.Json.Serialization;

namespace FlowInk.Core;

/// <summary>
/// A node's pulse setting: off by default, a boolean for the standard 3s cycle,
/// or a number for a custom duration in milliseconds. JSON accepts <c>true</c>,
/// <c>false</c>, or a number; C# accepts bools and ints through implicit
/// conversions — <c>Pulse = true</c> and <c>Pulse = 2400</c> both read naturally.
/// </summary>
[JsonConverter(typeof(PulseJsonConverter))]
public readonly record struct Pulse(bool Enabled, int DurationMs)
{
    public static readonly Pulse Off = new(false, 0);

    public static implicit operator Pulse(bool enabled) =>
        enabled ? new Pulse(true, 3000) : Off;

    public static implicit operator Pulse(int durationMs) =>
        durationMs > 0 ? new Pulse(true, durationMs) : Off;
}

public sealed class PulseJsonConverter : JsonConverter<Pulse>
{
    public override Pulse Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        return reader.TokenType switch
        {
            JsonTokenType.True => true,
            JsonTokenType.False => false,
            JsonTokenType.Number => reader.GetInt32(),
            JsonTokenType.Null => Pulse.Off,
            _ => Pulse.Off,
        };
    }

    public override void Write(Utf8JsonWriter writer, Pulse value, JsonSerializerOptions options)
    {
        if (!value.Enabled)
        {
            writer.WriteBooleanValue(false);
        }
        else if (value.DurationMs != 3000)
        {
            writer.WriteNumberValue(value.DurationMs);
        }
        else
        {
            writer.WriteBooleanValue(true);
        }
    }
}
