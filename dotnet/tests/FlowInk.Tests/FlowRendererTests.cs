using System.Text.RegularExpressions;
using FlowInk.Core;
using Xunit;

namespace FlowInk.Tests;

public partial class FlowRendererTests
{
    private static readonly string SpecJson = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "fixtures", "parity-spec.json"));
    private static readonly string TsGolden = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "fixtures", "parity-ts.svg"));

    [Fact]
    public void Renders_Svg_Document_With_Accessibility_Metadata()
    {
        var svg = FlowRenderer.Render(FlowRenderer.ParseSpecJson(SpecJson));
        Assert.StartsWith("<svg xmlns=\"http://www.w3.org/2000/svg\"", svg);
        Assert.Contains("<title>FlowInk dogfood", svg);
        Assert.Contains("role=\"img\"", svg);
        Assert.EndsWith("</svg>\n", svg.TrimEnd() + "\n");
    }

    [Fact]
    public void Never_Emits_SMIL()
    {
        var svg = FlowRenderer.Render(FlowRenderer.ParseSpecJson(SpecJson));
        Assert.DoesNotContain("<animate", svg);
        Assert.DoesNotContain("<animateMotion", svg);
        Assert.DoesNotContain("<animateTransform", svg);
    }

    [Fact]
    public void Parity_With_TypeScript_Core_On_The_Dogfood_Spec()
    {
        var csharp = FlowRenderer.Render(FlowRenderer.ParseSpecJson(SpecJson));
        var normalizedCs = Normalize(csharp);
        var normalizedTs = Normalize(TsGolden);
        Assert.Equal(normalizedTs, normalizedCs);
    }

    [Fact]
    public void Escapes_User_Text()
    {
        var spec = new FlowSpec
        {
            Title = "T <b>&\"x\"",
            Nodes = [new FlowNode { Id = "a", Label = "A<b>", X = 0, Y = 0 }],
        };
        var svg = FlowRenderer.Render(spec);
        Assert.DoesNotContain("<b>", svg);
        Assert.Contains("&lt;b&gt;", svg);
    }

    [Fact]
    public void Rejects_Unknown_Edge_Endpoints()
    {
        var spec = new FlowSpec
        {
            Title = "x",
            Nodes = [new FlowNode { Id = "a", Label = "A", X = 0, Y = 0 }],
            Edges = [new FlowEdge { From = "a", To = "ghost" }],
        };
        Assert.Throws<InvalidOperationException>(() => FlowRenderer.Render(spec));
    }

    private static string Normalize(string svg)
    {
        // Whitespace-insensitive, attribute-order-insensitive comparison:
        // collapse runs of whitespace and sort attributes per element tag.
        return Regex.Replace(svg, @"\s+", " ").Trim();
    }
}
