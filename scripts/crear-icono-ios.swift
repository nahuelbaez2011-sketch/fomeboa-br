// FomeBoa SP original app icon generator (macOS AppKit, no external assets).
// Usage: swift scripts/crear-icono-ios.swift /path/to/AppIcon.png
import AppKit
import Foundation

guard CommandLine.arguments.count == 2 else {
    fputs("Usage: swift crear-icono-ios.swift output.png\n", stderr)
    exit(2)
}
let file = CommandLine.arguments[1]
let dimension = 1024
guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: dimension,
    pixelsHigh: dimension,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
), let ctx = NSGraphicsContext(bitmapImageRep: bitmap) else {
    fputs("Could not allocate icon bitmap\n", stderr)
    exit(1)
}
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = ctx
ctx.imageInterpolation = .high

let background = NSColor(calibratedRed: 0.055, green: 0.185, blue: 0.142, alpha: 1)
let forest = NSColor(calibratedRed: 0.090, green: 0.280, blue: 0.204, alpha: 1)
let gold = NSColor(calibratedRed: 0.963, green: 0.811, blue: 0.341, alpha: 1)
let ivory = NSColor(calibratedRed: 0.965, green: 0.957, blue: 0.874, alpha: 1)
background.setFill()
NSRect(x: 0, y: 0, width: dimension, height: dimension).fill()

// Large concentric plate for visual clarity even at home-screen size.
forest.setFill()
NSBezierPath(ovalIn: NSRect(x: 238, y: 235, width: 548, height: 548)).fill()
let plate = NSBezierPath(ovalIn: NSRect(x: 260, y: 257, width: 504, height: 504))
plate.lineWidth = 24
gold.setStroke()
plate.stroke()
let inside = NSBezierPath(ovalIn: NSRect(x: 314, y: 311, width: 396, height: 396))
inside.lineWidth = 4
ivory.withAlphaComponent(0.32).setStroke()
inside.stroke()

// Fork: four matching tines and a long stem.
let fork = NSBezierPath()
fork.lineWidth = 17
fork.lineCapStyle = .round
for x in [132.0, 164.0, 196.0, 228.0] {
    fork.move(to: NSPoint(x: x, y: 680))
    fork.line(to: NSPoint(x: x, y: 535))
}
fork.move(to: NSPoint(x: 132, y: 537))
fork.curve(to: NSPoint(x: 228, y: 537),
           controlPoint1: NSPoint(x: 154, y: 496),
           controlPoint2: NSPoint(x: 206, y: 496))
fork.move(to: NSPoint(x: 180, y: 520))
fork.line(to: NSPoint(x: 180, y: 290))
gold.setStroke()
fork.stroke()

// Knife silhouette: broad blade, narrow handle.
let blade = NSBezierPath()
blade.move(to: NSPoint(x: 833, y: 704))
blade.curve(to: NSPoint(x: 887, y: 516),
             controlPoint1: NSPoint(x: 874, y: 672),
             controlPoint2: NSPoint(x: 885, y: 576))
blade.line(to: NSPoint(x: 835, y: 515))
blade.close()
gold.setFill()
blade.fill()
let knife = NSBezierPath()
knife.lineWidth = 20
knife.lineCapStyle = .round
knife.move(to: NSPoint(x: 847, y: 518))
knife.line(to: NSPoint(x: 847, y: 290))
gold.setStroke()
knife.stroke()

// Compact F monogram on the center of the plate.
let label = NSAttributedString(
    string: "F",
    attributes: [
        .font: NSFont.systemFont(ofSize: 285, weight: .bold),
        .foregroundColor: ivory
    ]
)
let bounds = label.size()
label.draw(at: NSPoint(x: (1024 - bounds.width) / 2 + 7,
                       y: (1024 - bounds.height) / 2 - 12))
NSGraphicsContext.restoreGraphicsState()

guard let png = bitmap.representation(using: .png, properties: [:]) else {
    fputs("Failed to encode PNG\n", stderr)
    exit(1)
}
let destination = URL(fileURLWithPath: file)
try FileManager.default.createDirectory(
    at: destination.deletingLastPathComponent(),
    withIntermediateDirectories: true
)
try png.write(to: destination, options: .atomic)
print("Generated FomeBoa app icon at \(destination.path)")
