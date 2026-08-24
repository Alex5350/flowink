using System.Text.Json;

namespace FlowInk.Core;

/// <summary>
/// C# renderer for FlowInk specs — output parity with the TypeScript core is
/// enforced by tests (same spec JSON produces a structurally identical SVG).
/// Same hard guarantees: CSS-only animation, no SMIL, no external references.
/// </summary>
public static class FlowRenderer
{
    public static FlowSpec ParseSpecJson(string json) =>
        JsonSerializer.Deserialize<FlowSpec>(json, JsonOptions.Instance)
        ?? throw new InvalidOperationException("Spec JSON deserialized to null.");

    public static string Render(FlowSpec spec)
    {
        Validate(spec);
        var theme = spec.Theme == "light" ? Theme.Light : Theme.Dark;
        // Same rationale as the TypeScript core: inline SVG <style> is document-
        // scoped, so classes and keyframes are suffixed by theme to keep
        // different-theme diagrams on one page independent.
        var scope = spec.Theme == "light" ? "light" : "dark";
        var width = spec.Width ?? 1200;
        var height = spec.Height ?? 640;

        var boxes = spec.Nodes.ToDictionary(
            n => n.Id,
            n => MeasureNode(n));

        var parts = new List<string>
        {
            OpenSvg(spec, width, height),
            RenderDefs(scope),
            RenderStyle(scope, theme),
            RenderBackground(width, height, theme, scope),
            RenderTitle(spec, width, theme),
        };

        foreach (var edge in spec.Edges)
        {
            parts.Add(RenderEdge(edge, boxes, theme, scope));
        }
        foreach (var node in spec.Nodes)
        {
            parts.Add(RenderNode(node, boxes[node.Id], theme, scope));
        }

        parts.Add("</svg>\n");
        return string.Join("\n", parts);
    }

    private static void Validate(FlowSpec spec)
    {
        if (spec.Nodes.Select(n => n.Id).Distinct().Count() != spec.Nodes.Count)
        {
            throw new InvalidOperationException("Duplicate node ids in spec.");
        }
        var ids = spec.Nodes.Select(n => n.Id).ToHashSet();
        foreach (var edge in spec.Edges)
        {
            if (!ids.Contains(edge.From) || !ids.Contains(edge.To))
            {
                throw new InvalidOperationException($"Edge references unknown node: {edge.From} -> {edge.To}");
            }
        }
    }

    private static Box MeasureNode(FlowNode node)
    {
        var lines = node.Lines ?? [];
        var longest = new[] { node.Label.Length }.Concat(lines.Select(l => l.Length)).Append(8).Max();
        var widthDefault = Math.Max(160, (int)Math.Ceiling(longest * 7.2) + 40);
        var heightDefault = Math.Max(64, 40 + (1 + lines.Count) * 18 + (lines.Count > 0 ? 8 : 0));
        return new Box(node.X, node.Y, node.Width ?? widthDefault, node.Height ?? heightDefault);
    }

    private static string OpenSvg(FlowSpec spec, int width, int height)
    {
        var label = $"{spec.Title}{(spec.Subtitle is not null ? $" — {spec.Subtitle}" : "")}. Animated flows: colored dashes move along request paths; node borders breathe.";
        return
            "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"" + width + "\" height=\"" + height +
            "\" viewBox=\"0 0 " + width + " " + height + "\" role=\"img\" aria-label=\"" + Escape(label) + "\">\n" +
            "  <title>" + Escape(spec.Title) + "</title>";
    }

    private static string RenderDefs(string scope) =>
        "  <defs>\n" +
        $"    <pattern id=\"fi-{scope}-dots\" width=\"24\" height=\"24\" patternUnits=\"userSpaceOnUse\">\n" +
        "      <circle cx=\"1\" cy=\"1\" r=\"1\" fill=\"" + Theme.Dark.Dot + "\"/>\n" +
        "    </pattern>\n" +
        "  </defs>";

    private static string RenderStyle(string scope, Theme t) => string.Join("\n", new[]
    {
        "  <style>",
        $"    .fi-{scope}-node {{ fill: {t.NodeFill}; stroke: {t.NodeStroke}; stroke-width: 1.2; }}",
        $"    .fi-{scope}-edge {{ stroke: {t.Edge}; stroke-width: 1.5; fill: none; }}",
        $"    .fi-{scope}-pulse {{ animation: fi-{scope}-pulse 3s ease-in-out infinite; }}",
        $"    .fi-{scope}-flow-sky {{ stroke: {t.Sky}; stroke-width: 2; fill: none; stroke-dasharray: 5 11; animation: fi-{scope}-dash-sky-f 1.5s linear infinite; }}",
        $"    .fi-{scope}-flow-sky-b {{ animation-name: fi-{scope}-dash-sky-b; }}",
        $"    .fi-{scope}-flow-emerald {{ stroke: {t.Emerald}; stroke-width: 2; fill: none; stroke-dasharray: 5 11; animation: fi-{scope}-dash-emerald-f 1.5s linear infinite; }}",
        $"    .fi-{scope}-flow-emerald-b {{ animation-name: fi-{scope}-dash-emerald-b; }}",
        $"    .fi-{scope}-flow-amber {{ stroke: {t.Amber}; stroke-width: 2; fill: none; stroke-dasharray: 5 11; animation: fi-{scope}-dash-amber-f 1.5s linear infinite; }}",
        $"    .fi-{scope}-flow-amber-b {{ animation-name: fi-{scope}-dash-amber-b; }}",
        $"    .fi-{scope}-flow-rose {{ stroke: {t.Rose}; stroke-width: 2; fill: none; stroke-dasharray: 5 11; animation: fi-{scope}-dash-rose-f 1.5s linear infinite; }}",
        $"    .fi-{scope}-flow-rose-b {{ animation-name: fi-{scope}-dash-rose-b; }}",
        $"    .fi-{scope}-packet {{ animation: fi-{scope}-ride 1.5s linear infinite; }}",
        $"    @keyframes fi-{scope}-pulse {{ 0%, 100% {{ stroke-opacity: 1; }} 50% {{ stroke-opacity: .5; }} }}",
        $"    @keyframes fi-{scope}-ride {{ from {{ offset-distance: 0%; }} to {{ offset-distance: 100%; }} }}",
        $"    @keyframes fi-{scope}-dash-sky-f {{ to {{ stroke-dashoffset: -16; }} }}",
        $"    @keyframes fi-{scope}-dash-sky-b {{ to {{ stroke-dashoffset: 16; }} }}",
        $"    @keyframes fi-{scope}-dash-emerald-f {{ to {{ stroke-dashoffset: -16; }} }}",
        $"    @keyframes fi-{scope}-dash-emerald-b {{ to {{ stroke-dashoffset: 16; }} }}",
        $"    @keyframes fi-{scope}-dash-amber-f {{ to {{ stroke-dashoffset: -16; }} }}",
        $"    @keyframes fi-{scope}-dash-amber-b {{ to {{ stroke-dashoffset: 16; }} }}",
        $"    @keyframes fi-{scope}-dash-rose-f {{ to {{ stroke-dashoffset: -16; }} }}",
        $"    @keyframes fi-{scope}-dash-rose-b {{ to {{ stroke-dashoffset: 16; }} }}",
        $"    @media (prefers-reduced-motion: reduce) {{ .fi-{scope}-flow-sky, .fi-{scope}-flow-emerald, .fi-{scope}-flow-amber, .fi-{scope}-flow-rose {{ animation: none; }} .fi-{scope}-pulse, .fi-{scope}-packet {{ animation: none; }} }}",
        "  </style>",
    });

    private static string RenderBackground(int width, int height, Theme theme, string scope) =>
        $"  <rect width=\"{width}\" height=\"{height}\" fill=\"{theme.Canvas}\" style=\"fill:{theme.Canvas} !important\"/>\n" +
        $"  <rect width=\"{width}\" height=\"{height}\" fill=\"url(#fi-{scope}-dots)\" opacity=\".5\" style=\"fill:url(#fi-{scope}-dots) !important\"/>";

    private static string RenderTitle(FlowSpec spec, int width, Theme t)
    {
        var parts = new List<string>
        {
            $"""  <text x="40" y="46" style="font: 600 20px ui-sans-serif, system-ui, sans-serif !important; fill: {t.Title} !important" fill="{t.Title}">{Escape(spec.Title)}</text>""",
        };
        if (spec.Subtitle is not null)
        {
            parts.Add($"""  <text x="40" y="68" style="font: 12px ui-monospace, SFMono-Regular, Menlo, monospace !important; fill: {t.Subtitle} !important" fill="{t.Subtitle}">{Escape(spec.Subtitle)}</text>""");
        }
        if (spec.Chip is not null)
        {
            var chipWidth = Math.Max(200.0, spec.Chip.Length * 6.4 + 40);
            var chipX = width - chipWidth - 40;
            var inv = System.Globalization.CultureInfo.InvariantCulture;
            parts.Add($"  <rect x=\"{chipX.ToString(inv)}\" y=\"30\" width=\"{chipWidth.ToString(inv)}\" height=\"26\" rx=\"13\" fill=\"none\" stroke=\"{t.ChipStroke}\" stroke-opacity=\".5\" style=\"fill: none !important; stroke: {t.ChipStroke} !important; stroke-opacity: .5 !important\"/>");
            parts.Add($"  <text x=\"{(chipX + chipWidth / 2).ToString(inv)}\" y=\"47\" text-anchor=\"middle\" style=\"font: 10px ui-monospace, SFMono-Regular, Menlo, monospace !important; fill: {t.ChipStroke} !important\" fill=\"{t.ChipStroke}\">{Escape(spec.Chip)}</text>");
        }
        return string.Join("\n", parts);
    }

    private static string RenderEdge(FlowEdge edge, Dictionary<string, Box> boxes, Theme t, string scope)
    {
        var path = ConnectBoxes(boxes[edge.From], boxes[edge.To], edge.Path);
        var color = edge.Color ?? "sky";
        var direction = edge.Direction ?? "forward";
        var parts = new List<string> { $"  <path class=\"fi-{scope}-edge\" d=\"{path}\" style=\"stroke: {t.Edge} !important; fill: none !important; stroke-width: 1.5 !important\"/>" };

        if (direction != "none")
        {
            var backward = direction == "backward"
                ? $" fi-{scope}-flow-sky-b fi-{scope}-flow-emerald-b fi-{scope}-flow-amber-b fi-{scope}-flow-rose-b"
                : "";
            var flowStroke = t.Flow(color);
            parts.Add($"  <path class=\"fi-{scope}-flow-{color}{backward}\" d=\"{path}\" style=\"stroke: {flowStroke} !important; fill: none !important; stroke-width: 2 !important; stroke-dasharray: 5 11 !important\"/>");
        }

        if (edge.Label is not null)
        {
            var mid = PathMidpoint(path);
            parts.Add($"""  <text x="{(int)Math.Round(mid.X, MidpointRounding.AwayFromZero)}" y="{(int)Math.Round(mid.Y, MidpointRounding.AwayFromZero) - 8}" text-anchor="middle" style="font: 10px ui-monospace, SFMono-Regular, Menlo, monospace !important; fill: {t.Flow(color)} !important" fill="{t.Flow(color)}">{Escape(edge.Label)}</text>""");
        }

        if (edge.Packet && direction != "none")
        {
            parts.Add($"  <circle class=\"fi-{scope}-packet\" r=\"3.5\" fill=\"{t.Packet}\" style=\"offset-path: path('{path}'); fill: {t.Packet} !important\"/>");
        }

        return string.Join("\n", parts);
    }

    private static string RenderNode(FlowNode node, Box box, Theme t, string scope)
    {
        var parts = new List<string>();
        var pulseClass = node.Pulse is { Enabled: true } ? $" fi-{scope}-pulse" : "";
        var duration = node.Pulse is { Enabled: true, DurationMs: not 3000 } p ? $" style=\"animation-duration: {p.DurationMs}ms\"" : "";
        parts.Add($"  <rect class=\"fi-{scope}-node{pulseClass}\" x=\"{box.X}\" y=\"{box.Y}\" width=\"{box.Width}\" height=\"{box.Height}\" rx=\"10\" fill=\"{t.NodeFill}\" stroke=\"{t.NodeStroke}\"{duration} style=\"fill: {t.NodeFill} !important; stroke: {t.NodeStroke} !important; stroke-width: 1.2 !important\"/>");
        parts.Add($"""  <text x="{box.X + 20}" y="{box.Y + 26}" style="font: 600 13px ui-monospace, SFMono-Regular, Menlo, monospace !important; letter-spacing: .5px !important; fill: {t.NodeText} !important" fill="{t.NodeText}">{Escape(node.Label)}</text>""");
        var index = 0;
        foreach (var line in node.Lines ?? [])
        {
            parts.Add($"""  <text x="{box.X + 20}" y="{box.Y + 48 + index * 18}" style="font: 11px ui-monospace, SFMono-Regular, Menlo, monospace !important; fill: {t.BodyText} !important" fill="{t.BodyText}">{Escape(line)}</text>""");
            index++;
        }
        return string.Join("\n", parts);
    }

    internal static string ConnectBoxes(Box a, Box b, string? manual)
    {
        if (manual is not null)
        {
            // Untrusted text destined for d="" and the offset-path style value:
            // escape exactly like every other spec string (TS core parity).
            return Escape(manual);
        }
        var horizontalGap = Math.Max(a.X, b.X) - Math.Min(a.X + a.Width, b.X + b.Width);
        if (horizontalGap >= -40)
        {
            var (left, right) = a.X + a.Width / 2.0 < b.X + b.Width / 2.0 ? (a, b) : (b, a);
            var startX = left.X + left.Width;
            var endX = right.X;
            var rawY = (left.Y + left.Height / 2.0 + right.Y + right.Height / 2.0) / 2;
            var startY = ClampVertical(rawY, left);
            var endY = ClampVertical(rawY, right);
            if (Math.Abs(startY - endY) < 8)
            {
                return $"M{startX},{startY} H{endX}";
            }
            var midX = (int)Math.Round((startX + endX) / 2.0);
            return $"M{startX},{startY} C{midX},{startY} {midX},{endY} {endX},{endY}";
        }
        else
        {
            var (top, bottom) = a.Y + a.Height / 2.0 < b.Y + b.Height / 2.0 ? (a, b) : (b, a);
            var startY = top.Y + top.Height;
            var endY = bottom.Y;
            var rawX = (top.X + top.Width / 2.0 + bottom.X + bottom.Width / 2.0) / 2;
            var startX = ClampHorizontal(rawX, top);
            var endX = ClampHorizontal(rawX, bottom);
            if (Math.Abs(startX - endX) < 8)
            {
                return $"M{startX},{startY} V{endY}";
            }
            var midY = (int)Math.Round((startY + endY) / 2.0);
            return $"M{startX},{startY} C{startX},{midY} {endX},{midY} {endX},{endY}";
        }
    }

    internal static (double X, double Y) PathMidpoint(string path)
    {
        var numbers = System.Text.RegularExpressions.Regex
            .Matches(path, @"-?\d+(?:\.\d+)?")
            .Select(m => double.Parse(m.Value))
            .ToList();
        if (numbers.Count < 2)
        {
            return (0, 0);
        }
        var xs = numbers.Where((_, i) => i % 2 == 0).ToList();
        var ys = numbers.Where((_, i) => i % 2 == 1).ToList();
        return ((xs.Min() + xs.Max()) / 2, (ys.Min() + ys.Max()) / 2);
    }

    private static int ClampVertical(double value, Box box) =>
        (int)Math.Round(Math.Min(Math.Max(value, box.Y + 10), box.Y + box.Height - 10), MidpointRounding.AwayFromZero);

    private static int ClampHorizontal(double value, Box box) =>
        (int)Math.Round(Math.Min(Math.Max(value, box.X + 10), box.X + box.Width - 10), MidpointRounding.AwayFromZero);

    private static string Escape(string value) => value
        .Replace("&", "&amp;")
        .Replace("<", "&lt;")
        .Replace(">", "&gt;")
        .Replace("\"", "&quot;")
        .Replace("'", "&apos;");

    internal sealed record Box(int X, int Y, int Width, int Height);
}

internal static class JsonOptions
{
    public static readonly JsonSerializerOptions Instance = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
    };
}
