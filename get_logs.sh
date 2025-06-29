#!/bin/bash

# TimeBrew Backend - AWS Lambda Logs Collector Script
# This script collects logs for all Lambda functions defined in serverless.yml
# Downloads logs in parallel and saves them to individual files in the logs directory
# Automatically cleans up existing log files before collecting new ones

# Configuration
SERVICE_NAME="timebrew-backend"
STAGE="${1:-dev}"  # Default to 'dev' if no stage provided
REGION="us-east-1"
SINCE="5m"  # Get logs from last 5 minutes
LOGS_DIR="./logs"  # Directory to save log files

# Lambda functions from serverless.yml
FUNCTIONS=(
    "health"
    "register"
    "getBrews"
    "getBrew"
    "createBrew"
    "newsCurator"
    "newsEditor"
    "emailDispatcher"
    "brewScheduler"
    "triggerBrew"
    "getBriefings"
    "submitFeedback"
)

# Function to clean up existing log files
cleanup_logs() {
    if [[ -d "${LOGS_DIR}" ]]; then
        echo "Cleaning up existing log files..."
        rm -f "${LOGS_DIR}"/*.log 2>/dev/null
        echo "✓ Cleaned up existing log files"
        echo ""
    fi
}

# Function to collect logs for a specific Lambda function (parallel version)
collect_function_logs() {
    local function_name="$1"
    local log_group_name="/aws/lambda/${SERVICE_NAME}-${STAGE}-${function_name}"
    local output_file="${LOGS_DIR}/${function_name}-${STAGE}.log"
    
    echo "Collecting logs for ${function_name}..."
    
    # Get logs and save to file
    aws logs tail "${log_group_name}" \
        --since "${SINCE}" \
        --region "${REGION}" \
        --format short \
        > "${output_file}" 2>/dev/null
    
    if [[ $? -eq 0 && -s "${output_file}" ]]; then
        echo "✓ Saved logs to: ${output_file}"
        local line_count=$(wc -l < "${output_file}")
        echo "  Lines: ${line_count}"
    else
        echo "✗ No logs found for ${function_name}"
        rm -f "${output_file}"  # Remove empty file
    fi
}

# Function to collect logs for all functions (parallel version)
collect_all_logs() {
    echo "Collecting logs for all TimeBrew Lambda functions..."
    echo "Service: ${SERVICE_NAME}"
    echo "Stage: ${STAGE}"
    echo "Region: ${REGION}"
    echo "Since: ${SINCE}"
    echo "Output Directory: ${LOGS_DIR}"
    echo ""
    
    # Clean up existing log files
    cleanup_logs
    
    # Create logs directory
    mkdir -p "${LOGS_DIR}"
    
    local total_count=${#FUNCTIONS[@]}
    echo "Starting parallel collection of ${total_count} functions..."
    echo ""
    
    # Start all log collection jobs in parallel
    local pids=()
    for function_name in "${FUNCTIONS[@]}"; do
        collect_function_logs "${function_name}" &
        pids+=("$!")
    done
    
    # Wait for all background jobs to complete
    echo "Waiting for all log collection jobs to complete..."
    for pid in "${pids[@]}"; do
        wait "$pid"
    done
    
    echo ""
    echo "All parallel jobs completed!"
    echo ""
    
    # Count successful collections
    local success_count=0
    for function_name in "${FUNCTIONS[@]}"; do
        if [[ -f "${LOGS_DIR}/${function_name}-${STAGE}.log" ]]; then
            ((success_count++))
        fi
    done
    
    echo "Collection Summary:"
    echo "✓ Successfully collected: ${success_count}/${total_count} functions"
    echo "📁 Logs saved in: ${LOGS_DIR}/"
    
    # List all collected log files
    if [[ ${success_count} -gt 0 ]]; then
        echo ""
        echo "Generated log files:"
        ls -la "${LOGS_DIR}/"*.log 2>/dev/null | while read -r line; do
            echo "  ${line}"
        done
    fi
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed or not in PATH"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "Error: AWS credentials not configured or invalid"
    exit 1
fi

# Usage information
show_usage() {
    echo "Usage: $0 [stage] [function_name]"
    echo ""
    echo "Arguments:"
    echo "  stage         - Deployment stage (default: dev)"
    echo "  function_name - Specific function to collect (optional)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Collect all functions in dev stage"
    echo "  $0 prod               # Collect all functions in prod stage"
    echo "  $0 dev health         # Collect only health function in dev stage"
    echo ""
    echo "Available functions:"
    for func in "${FUNCTIONS[@]}"; do
        echo "  - ${func}"
    done
}

# Main execution
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_usage
    exit 0
fi

# If specific function is provided
if [[ -n "$2" ]]; then
    FUNCTION_NAME="$2"
    
    # Check if function exists in our list
    if [[ " ${FUNCTIONS[*]} " =~ " ${FUNCTION_NAME} " ]]; then
        # Clean up existing log files
        cleanup_logs
        
        # Create logs directory
        mkdir -p "${LOGS_DIR}"
        
        collect_function_logs "${FUNCTION_NAME}"
        echo ""
        echo "Log file saved: ${LOGS_DIR}/${FUNCTION_NAME}-${STAGE}.log"
    else
        echo "Error: Function '${FUNCTION_NAME}' not found"
        echo ""
        show_usage
        exit 1
    fi
else
    # Collect all functions
    collect_all_logs
fi