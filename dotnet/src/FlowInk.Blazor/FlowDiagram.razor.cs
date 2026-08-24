using FlowInk.Core;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Rendering;

namespace FlowInk.Blazor;

/// <summary>
/// Renders a FlowInk diagram. The SVG markup comes entirely from FlowInk.Core's
/// renderer (escaped spec text, no scripts, no external references, no SMIL),
/// so injecting it as raw markup is safe by construction. Static SSR renders
/// identically — no JS interop.
/// </summary>
public sealed class FlowDiagram : ComponentBase
{
    [Parameter, EditorRequired]
    public FlowSpec Spec { get; set; } = new();

    [Parameter]
    public string? Class { get; set; }

    protected override void BuildRenderTree(RenderTreeBuilder builder)
    {
        var svg = FlowRenderer.Render(Spec);
        builder.OpenElement(0, "div");
        builder.AddAttribute(1, "role", "img");
        builder.AddAttribute(2, "aria-label", Spec.Title);
        if (Class is not null)
        {
            builder.AddAttribute(3, "class", Class);
        }
        builder.AddContent(4, new MarkupString(svg));
        builder.CloseElement();
    }
}
