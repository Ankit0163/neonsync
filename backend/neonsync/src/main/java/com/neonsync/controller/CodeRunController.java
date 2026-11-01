package com.neonsync.controller;

import org.springframework.web.bind.annotation.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.TimeUnit;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
public class CodeRunController {

    @PostMapping("/run")
    public Map<String, String> runCode(@RequestBody Map<String, String> body) {
        String code = body.getOrDefault("code", "");
        String language = body.getOrDefault("language", "");

        return switch (language) {
            case "java"       -> runJava(code);
            case "python"     -> runProcess(code, ".py", "python");
            case "javascript" -> runProcess(code, ".js", "node");
            default -> Map.of("output", "⚠️ Language '" + language + "' is not supported for execution.");
        };
    }

    // ─── Java ───────────────────────────────────────────────────────────────
    private Map<String, String> runJava(String code) {
        try {
            String className = "Main";
            for (String line : code.split("\n")) {
                String trimmed = line.trim();
                if (trimmed.startsWith("public class ")) {
                    className = trimmed.split("\\s+")[2].replaceAll("[^a-zA-Z0-9_]", "");
                    break;
                }
            }

            File tempDir = new File(System.getProperty("java.io.tmpdir"),
                    "neonsync_" + UUID.randomUUID());
            tempDir.mkdirs();

            File javaFile = new File(tempDir, className + ".java");
            try (FileWriter fw = new FileWriter(javaFile)) {
                fw.write(code);
            }

            // Compile
            Process compile = new ProcessBuilder("javac", javaFile.getAbsolutePath())
                    .redirectErrorStream(false)
                    .start();
            compile.waitFor(15, TimeUnit.SECONDS);

            String compileError = new String(compile.getErrorStream().readAllBytes());
            if (!compileError.isBlank()) {
                return Map.of("output", "❌ Compilation Error:\n" + compileError);
            }

            // Run
            Process run = new ProcessBuilder("java", "-cp", tempDir.getAbsolutePath(), className)
                    .redirectErrorStream(false)
                    .start();

            boolean finished = run.waitFor(10, TimeUnit.SECONDS);
            if (!finished) { run.destroy(); return Map.of("output", "⏱️ Timed out (10s limit)"); }

            String output   = new String(run.getInputStream().readAllBytes());
            String runError = new String(run.getErrorStream().readAllBytes());

            if (!runError.isBlank()) return Map.of("output", "❌ Runtime Error:\n" + runError);
            return Map.of("output", output.isBlank() ? "(no output)" : output);

        } catch (Exception e) {
            return Map.of("output", "🔴 Server Error: " + e.getMessage());
        }
    }

    // ─── Python & JavaScript (shared logic) ─────────────────────────────────
    private Map<String, String> runProcess(String code, String ext, String... command) {
        try {
            File tempDir = new File(System.getProperty("java.io.tmpdir"),
                    "neonsync_" + UUID.randomUUID());
            tempDir.mkdirs();

            File codeFile = new File(tempDir, "main" + ext);
            try (FileWriter fw = new FileWriter(codeFile)) {
                fw.write(code);
            }

            List<String> cmd = new ArrayList<>(Arrays.asList(command));
            cmd.add(codeFile.getAbsolutePath());

            Process run = new ProcessBuilder(cmd)
                    .redirectErrorStream(false)
                    .start();

            boolean finished = run.waitFor(10, TimeUnit.SECONDS);
            if (!finished) { run.destroy(); return Map.of("output", "⏱️ Timed out (10s limit)"); }

            String output   = new String(run.getInputStream().readAllBytes());
            String runError = new String(run.getErrorStream().readAllBytes());

            if (!runError.isBlank()) return Map.of("output", "❌ Error:\n" + runError);
            return Map.of("output", output.isBlank() ? "(no output)" : output);

        } catch (Exception e) {
            return Map.of("output", "🔴 Server Error: " + e.getMessage());
        }
    }
}