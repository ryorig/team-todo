// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "TeamTodoWidget",
    platforms: [.macOS(.v13)],
    products: [
        .executable(name: "TeamTodoWidget", targets: ["TeamTodoWidget"]),
    ],
    targets: [
        .executableTarget(name: "TeamTodoWidget"),
    ]
)
