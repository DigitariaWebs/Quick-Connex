import { NextRequest, NextResponse } from "next/server";
import Transfer from "@/models/Transfer";
import { log } from '@/lib/logging';

export async function GET(request: NextRequest) {
  try {
    // DatabaseService handles connection automatically
const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const priority = searchParams.get("priority") || "";
    const category = searchParams.get("category") || "";

    // Build query object
    const query: any = {};

    // Text search across multiple fields
    if (search.trim()) {
      query.$or = [
        { transferId: { $regex: search, $options: "i" } },
        { reason: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
        { "patientInfo.firstName": { $regex: search, $options: "i" } },
        { "patientInfo.lastName": { $regex: search, $options: "i" } },
        { "patientInfo.dossierNumber": { $regex: search, $options: "i" } },
        { "transferData.patientInfo.firstName": { $regex: search, $options: "i" } },
        { "transferData.patientInfo.lastName": { $regex: search, $options: "i" } },
        { "transferData.patientInfo.dossierNumber": { $regex: search, $options: "i" } },
        { "transferData.envelopeInfo.senderName": { $regex: search, $options: "i" } },
        { "transferData.envelopeInfo.recipientName": { $regex: search, $options: "i" } },
        { "transferData.envelopeInfo.contents": { $regex: search, $options: "i" } },
        { "transferData.fileInfo.patientName": { $regex: search, $options: "i" } },
        { "transferData.equipmentInfo.equipmentName": { $regex: search, $options: "i" } },
        { "requestedBy.firstName": { $regex: search, $options: "i" } },
        { "requestedBy.lastName": { $regex: search, $options: "i" } },
      ];
    }

    // Add status filter
    if (status) {
      query.status = status;
    }

    // Add priority filter
    if (priority) {
      query.priority = priority;
    }

    // Add category filter
    if (category) {
      query.transferCategory = category;
    }

    // Execute search with population
    const transfers = await Transfer.find(query)
      .populate("fromHospital", "name address organization")
      .populate("toHospital", "name address organization")
      .populate("requestedBy", "firstName lastName email userType")
      .sort({ requestedDate: -1 })
      .limit(50); // Limit results for performance

    return NextResponse.json({
      success: true,
      transfers,
      count: transfers.length,
    });
  } catch (error) {
    log.error('Search transfers error', error, {
      category: 'transfer',
      operation: 'search_transfers'
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to search transfers",
      },
      { status: 500 }
    );
  }
}
