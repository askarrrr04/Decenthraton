package main

import (
	"bytes"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strings"

	"github.com/gin-contrib/cors" // Add CORS package
	"github.com/gin-gonic/gin"
)

type ParsedResult struct {
	Parts   []string `json:"parts"`
	Issues  []string `json:"issues"`
	Status  string   `json:"status"`
	Summary []string `json:"summary"`
}

type FilteredResult struct {
	Bumpers []string `json:"bumpers"`
	Doors   []string `json:"doors"`
	Body    []string `json:"body"`
	Status  string   `json:"status"`
}

func main() {
	r := gin.Default()

	// Add CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"}, // Allow frontend origin
		AllowMethods:     []string{"POST", "OPTIONS"},       // Allow POST and OPTIONS (for preflight)
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,        // Set to true if credentials are needed
		MaxAge:           12 * 60 * 60, // Cache preflight for 12 hours
	}))

	r.POST("/upload", func(c *gin.Context) {
		file, err := c.FormFile("image")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Temporary file
		tempFile, err := os.CreateTemp("", "upload_*.jpg")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer os.Remove(tempFile.Name())

		if err := c.SaveUploadedFile(file, tempFile.Name()); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Call Python script
		cmd := exec.Command("C:\\Users\\askar\\AppData\\Local\\Microsoft\\WindowsApps\\python3.11.exe", `C:\Users\askar\Desktop\indrive code\test2.py`, tempFile.Name())
		var outBuf, errBuf bytes.Buffer
		cmd.Stdout = &outBuf
		cmd.Stderr = &errBuf
		if err := cmd.Run(); err != nil {
			errorMsg := fmt.Sprintf("AI processing failed: %v\nStderr: %s\nStdout: %s", err, errBuf.String(), outBuf.String())
			c.JSON(http.StatusInternalServerError, gin.H{"error": errorMsg})
			return
		}

		// Parse Python output
		output := outBuf.String()
		result := parseOutput(output)
		if result == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse YOLO output\nFull output: " + output})
			return
		}

		// Filter parts
		filtered := filterParts(*result)

		// Send filtered result to frontend
		c.JSON(http.StatusOK, filtered)
	})

	r.Run(":8080")
}

// parseOutput and filterParts functions remain unchanged
func parseOutput(output string) *ParsedResult {
	lines := strings.Split(output, "\n")
	result := &ParsedResult{Parts: []string{}, Issues: []string{}, Summary: []string{}, Status: ""}

	for i, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "0:") && strings.Contains(line, "ms") {
			partsLine := strings.Split(line, "ms")[0]
			parts := strings.Split(partsLine, ", ")
			for _, part := range parts {
				part = strings.TrimSpace(part)
				if strings.Contains(part, " ") {
					part = strings.Split(part, " ")[1]
					if part != "" && !strings.HasPrefix(part, "Speed") {
						result.Parts = append(result.Parts, part)
					}
				}
			}
		} else if strings.HasPrefix(line, "🔧 Повреждённые детали:") {
			for j := i + 1; j < len(lines) && !strings.HasPrefix(lines[j], "🧹"); j++ {
				damage := strings.TrimSpace(lines[j])
				if damage != "" {
					result.Summary = append(result.Summary, damage)
				}
			}
		} else if strings.HasPrefix(line, "🧹 Состояние грязи/чисто:") {
			if len(lines) > i+1 {
				result.Status = strings.TrimSpace(lines[i+1])
			}
		}
	}

	issues := make(map[string]bool)
	for _, s := range result.Summary {
		if idx := strings.Index(s, " ("); idx != -1 {
			issue := strings.TrimSpace(s[idx+2 : len(s)-1])
			issues[issue] = true
		}
	}
	for issue := range issues {
		result.Issues = append(result.Issues, issue)
	}

	return result
}

func filterParts(result ParsedResult) FilteredResult {
	filtered := FilteredResult{
		Bumpers: []string{},
		Doors:   []string{},
		Body:    []string{},
		Status:  result.Status,
	}

	partMap := map[string]string{
		"front_bumper":     "bumpers",
		"back_bumper":      "bumpers",
		"back_left_door":   "doors",
		"back_right_door":  "doors",
		"front_left_door":  "doors",
		"front_right_door": "doors",
		"hood":             "body",
		"front_glass":      "body",
		"back_glass":       "body",
	}

	damagedParts := make(map[string]bool)
	for _, summary := range result.Summary {
		if idx := strings.Index(summary, " ("); idx != -1 {
			part := summary[:idx]
			damagedParts[part] = true
		}
	}

	for _, summary := range result.Summary {
		if idx := strings.Index(summary, " ("); idx != -1 {
			part := summary[:idx]
			if category, ok := partMap[part]; ok {
				switch category {
				case "bumpers":
					if !contains(filtered.Bumpers, summary) {
						filtered.Bumpers = append(filtered.Bumpers, summary)
					}
				case "doors":
					if !contains(filtered.Doors, summary) {
						filtered.Doors = append(filtered.Doors, summary)
					}
				case "body":
					if !contains(filtered.Body, summary) {
						filtered.Body = append(filtered.Body, summary)
					}
				}
			}
		}
	}

	for _, part := range result.Parts {
		if category, ok := partMap[part]; ok && !damagedParts[part] {
			switch category {
			case "bumpers":
				if !contains(filtered.Bumpers, part) {
					filtered.Bumpers = append(filtered.Bumpers, part)
				}
			case "doors":
				if !contains(filtered.Doors, part) {
					filtered.Doors = append(filtered.Doors, part)
				}
			case "body":
				if !contains(filtered.Body, part) {
					filtered.Body = append(filtered.Body, part)
				}
			}
		}
	}

	return filtered
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
