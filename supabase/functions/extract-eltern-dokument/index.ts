import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ocrApiKey = Deno.env.get("OCR_SPACE_API_KEY2")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      data: { user },
      error: userError,
    } = (await req.headers.get("Authorization"))
      ? await supabase.auth.getUser(req.headers.get("Authorization")!.replace("Bearer ", ""))
      : { data: { user: null }, error: null };

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { filePath, documentType, personType } = await req.json();

    if (!filePath || !documentType || !personType) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${documentType} for ${personType}, file: ${filePath}`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("application-documents")
      .download(filePath);

    if (downloadError) {
      console.error("Download error:", downloadError);
      throw downloadError;
    }

    // Perform OCR
    // Extract original filename from path to preserve file extension
    const fileName = filePath.split("/").pop() || "document.pdf";
    const fileExtension = fileName.split(".").pop()?.toLowerCase() || "pdf";

    const formData = new FormData();
    formData.append("file", fileData, fileName);
    formData.append("filetype", fileExtension.toUpperCase()); // Explicitly set file type (PDF, JPG, PNG, etc.)
    formData.append("language", "auto");
    formData.append("isOverlayRequired", "false");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");
    formData.append("OCREngine", "2");

    const ocrResponse = await fetch("https://apipro1.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: ocrApiKey,
      },
      body: formData,
    });

    const ocrResult = await ocrResponse.json();
    console.log("OCR API response:", JSON.stringify(ocrResult, null, 2));

    // Helper function to convert DD.MM.YYYY to YYYY-MM-DD
    const convertDate = (dateStr: string): string => {
      if (!dateStr) return "";
      const match = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      if (match) {
        const [, day, month, year] = match;
        return `${year}-${month}-${day}`;
      }
      return dateStr;
    };

    if (ocrResult.ParsedResults?.length > 0 && !ocrResult.IsErroredOnProcessing) {
      // Combine text from all pages (front and back of ID card)
      const ocrText = ocrResult.ParsedResults.map((result: any) => result.ParsedText).join("\n\n");
      console.log("OCR Text (all pages):", ocrText);

      // Extract data based on document type
      const extractedData: any = {
        user_id: user.id,
        document_type: documentType,
        person_type: personType,
        file_path: filePath,
      };

      const lines = ocrText
        .split("\n")
        .map((l: string) => l.trim())
        .filter((l: string) => l);

      if (documentType === "personalausweis") {
        // Extract from ID card - Page 1 (Front)
        // Nachname - look for pattern after "(a)" marker
        const nachnameMatch = ocrText.match(/\(a\)\s*([A-ZÄÖÜ][A-ZÄÖÜ\s]+?)(?=\n)/);
        if (nachnameMatch) extractedData.nachname = nachnameMatch[1].trim();

        // Vorname - look for pattern after "Vornamen" or "Given names"
        const vornameMatch = ocrText.match(/(?:Vornamen|Given names)[^\n]*\n\s*([A-ZÄÖÜ][A-ZÄÖÜ\s]+?)(?=\n)/i);
        if (vornameMatch) extractedData.vorname = vornameMatch[1].trim();

        // Geburtsname - look for text after the Geburtsname label, but skip if it's empty or shows form text
        const geburtsnameMatch = ocrText.match(/\(b\][^\n]*\n\s*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?=\n)/i);
        if (geburtsnameMatch && geburtsnameMatch[1].trim().length > 0) {
          const geburtsname = geburtsnameMatch[1].trim();
          // Only set if it's not a serial number or form text
          if (!/^[A-Z0-9<]+$/.test(geburtsname) && geburtsname !== "Name at birth") {
            extractedData.geburtsname = geburtsname;
          }
        }

        // Geburtsdatum - find date in DD.MM.YYYY format (first occurrence)
        const geburtsdatumMatch = ocrText.match(/(\d{2}\.\d{2}\.\d{4})/);
        if (geburtsdatumMatch) extractedData.geburtsdatum = convertDate(geburtsdatumMatch[1]);

        // Geburtsort - look after "Geburtsort" or "Place of birth"
        const geburtsortMatch = ocrText.match(
          /(?:Geburtsort|Place of birth)[^\n]*\n\s*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?=\n)/i,
        );
        if (geburtsortMatch) extractedData.geburtsort = geburtsortMatch[1].trim();

        // Staatsangehörigkeit - look for DEUTSCH or other nationality
        const staatsMatch = ocrText.match(
          /(?:Staatsangeh[öo]rigkeit|Nationality)[^\n]*\n\s*(DEUTSCH|GERMAN|[A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?=\n)/i,
        );
        if (staatsMatch) extractedData.staatsangehoerigkeit = staatsMatch[1].trim();

        // Ausweisnummer - look for serial number pattern (letters and numbers like L3GF5CY11)
        const ausweisMatch = ocrText.match(/\b([A-Z][0-9][A-Z0-9]{7,9})\b/);
        if (ausweisMatch) extractedData.ausweisnummer = ausweisMatch[1].trim();

        // Gültig bis - find second date (first is birth date, second is expiry)
        const allDates = ocrText.match(/\d{2}\.\d{2}\.\d{4}/g);
        if (allDates && allDates.length > 1) {
          extractedData.gueltig_bis = convertDate(allDates[1]); // Second date is expiry
        }

        // Extract from ID card - Page 2 (Back) - Address information
        // Anschrift/Address - look for postal code and city
        const addressMatch = ocrText.match(
          /(?:Anschrift|Address)[^\n]*\n\s*(\d{5})\s+([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)(?=\n)/i,
        );
        if (addressMatch) {
          extractedData.plz = addressMatch[1].trim();
          extractedData.wohnort = addressMatch[2].trim();
        }

        // Street and house number - look for street name followed by numbers
        const streetMatch = ocrText.match(
          /(?:Anschrift|Address)[^\n]*\n[^\n]*\n\s*([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s-]+?)\s+(\d+[A-Za-z]?)\s*(?:\n|$)/i,
        );
        if (streetMatch) {
          extractedData.strasse = streetMatch[1].trim();
          extractedData.hausnummer = streetMatch[2].trim();
        }

        // Wohnungsnummer - look for additional number after street (if present on next line)
        const wohnungMatch = ocrText.match(/(?:Anschrift|Address)[^\n]*\n[^\n]*\n[^\n]*\n\s*(\d+)\s*(?:\n|$)/i);
        if (wohnungMatch && wohnungMatch[1] !== extractedData.hausnummer) {
          extractedData.wohnungsnummer = wohnungMatch[1].trim();
        }
      } else if (documentType === "reisepass") {
        // Extract from passport (MRZ format)
        // First try to find MRZ lines (Machine Readable Zone) - most reliable
        // MRZ Line 1: P<COUNTRY<<SURNAME<<GIVENNAMES<<<
        // MRZ Line 2: PASSPORTNUMBER<COUNTRY<BIRTHDATE<SEX<EXPIRYDATE<PERSONALNUMBER
        
        // Updated regex: capture country, then surname (no < chars), then << separator, then given names
        const mrzLine1Match = ocrText.match(/P[<B]([A-Z]{3})([A-Z]+)<<([A-Z<]+)/);
        const mrzLine2Match = ocrText.match(/([A-Z0-9]{9})<[0-9<]([A-Z]{3})(\d{6,7})(\d)([MF<])(\d{6,7})/);
        
        if (mrzLine1Match) {
          // Extract names from MRZ line 1
          // Group 2 = Surname, Group 3 = Given names
          const surname = mrzLine1Match[2].trim();
          const givenNames = mrzLine1Match[3].replace(/</g, " ").trim();
          extractedData.nachname = surname;
          extractedData.vorname = givenNames;
          console.log("Extracted from MRZ - Surname:", surname, "Given names:", givenNames);
        } else {
          // Fallback: Look for surname followed by given name on separate lines
          // Pattern: SURNAME on one line, GIVENNAME on next line
          const namePattern = ocrText.match(/\n([A-Z]{10,})\n([A-Z][A-Z]+)\n/);
          if (namePattern) {
            extractedData.nachname = namePattern[1].trim();
            extractedData.vorname = namePattern[2].trim();
            console.log("Extracted from pattern - Surname:", namePattern[1], "Given name:", namePattern[2]);
          } else {
            // Try to find names after labels
            const surnameMatch = ocrText.match(/(?:Surname|Last Name)[^\n]*\n\s*([A-Z][A-Za-z\s]+)/i);
            if (surnameMatch) {
              extractedData.nachname = surnameMatch[1].trim();
            }
            
            const givenNamesMatch = ocrText.match(/(?:Other Names|Given names)[^\n]*\n\s*([A-Z][A-Za-z\s]+)/i);
            if (givenNamesMatch) {
              extractedData.vorname = givenNamesMatch[1].trim();
            }
          }
        }
        
        if (mrzLine2Match) {
          // Extract passport number, nationality, dates from MRZ line 2
          extractedData.ausweisnummer = mrzLine2Match[1].trim();
          
          // Birth date from MRZ (format: YYMMDD or YYYYMMDD)
          const birthDateStr = mrzLine2Match[3];
          if (birthDateStr.length === 6 || birthDateStr.length === 7) {
            const yy = parseInt(birthDateStr.substring(0, 2));
            const year = yy > 50 ? `19${yy}` : `20${yy}`;
            const month = birthDateStr.substring(2, 4);
            const day = birthDateStr.substring(4, 6);
            extractedData.geburtsdatum = `${year}-${month}-${day}`;
          }
          
          // Expiry date from MRZ (format: YYMMDD or YYYYMMDD)
          const expiryDateStr = mrzLine2Match[6];
          if (expiryDateStr.length === 6 || expiryDateStr.length === 7) {
            const yy = parseInt(expiryDateStr.substring(0, 2));
            const year = yy > 50 ? `19${yy}` : `20${yy}`;
            const month = expiryDateStr.substring(2, 4);
            const day = expiryDateStr.substring(4, 6);
            extractedData.gueltig_bis = `${year}-${month}-${day}`;
          }
          
          console.log("Extracted from MRZ line 2 - Passport:", mrzLine2Match[1], "Birth date:", extractedData.geburtsdatum, "Expiry:", extractedData.gueltig_bis);
        }
        
        // Always try multiple extraction methods for passport number
        if (!extractedData.ausweisnummer) {
          // Look for pattern: Passport No followed by number or number on next line
          const passMatch1 = ocrText.match(/Passport\s+No[^\n]*\n\s*([A-Z]{1,2}[0-9]{7,9})/i);
          const passMatch2 = ocrText.match(/\n([A-Z]{1,2}[0-9]{7,9})\n/);
          
          if (passMatch1) {
            extractedData.ausweisnummer = passMatch1[1].trim();
          } else if (passMatch2) {
            extractedData.ausweisnummer = passMatch2[1].trim();
          }
        }
        
        // Always try date extraction in DD/MM/YYYY format
        if (!extractedData.geburtsdatum) {
          const birthMatch = ocrText.match(/(?:Date of Birth|Birth)[^\n]*\n?\s*(\d{2}[\/\.]\d{2}[\/\.]\d{4})/i);
          if (birthMatch) {
            const dateStr = birthMatch[1].replace(/\./g, '/');
            const [day, month, year] = dateStr.split('/');
            extractedData.geburtsdatum = `${year}-${month}-${day}`;
          }
        }
        
        if (!extractedData.ausstelldatum) {
          const issueMatch = ocrText.match(/(?:Date of issue|issue)[^\n]*\n?\s*(\d{2}[\/\.]\d{2}[\/\.]\d{4})/i);
          if (issueMatch) {
            const dateStr = issueMatch[1].replace(/\./g, '/');
            const [day, month, year] = dateStr.split('/');
            extractedData.ausstelldatum = `${year}-${month}-${day}`;
          }
        }
        
        if (!extractedData.gueltig_bis) {
          const expiryMatch = ocrText.match(/(?:Date of Expiry|Expiry)[^\n]*\n?\s*(\d{2}[\/\.]\d{2}[\/\.]\d{4})/i);
          if (expiryMatch) {
            const dateStr = expiryMatch[1].replace(/\./g, '/');
            const [day, month, year] = dateStr.split('/');
            extractedData.gueltig_bis = `${year}-${month}-${day}`;
          }
        }

        // Place of birth - clean up extra text
        const birthPlaceMatch = ocrText.match(/Place of Birth[:\s]*\n?\s*([A-Z][A-Za-z\s]+?)(?:\n|Biggi|[0-9])/i);
        if (birthPlaceMatch) {
          extractedData.geburtsort = birthPlaceMatch[1].trim();
        }

        // Nationality - look for common patterns
        const nationalityMatch = ocrText.match(/(?:SRI LANKAN|GERMAN|DEUTSCH|Nationality[:\s]*\n?\s*([A-Z][A-Za-z\s]+))/i);
        if (nationalityMatch) {
          extractedData.staatsangehoerigkeit = nationalityMatch[0].includes('SRI LANKAN') ? 'SRI LANKAN' : 
                                                nationalityMatch[0].includes('GERMAN') ? 'GERMAN' :
                                                nationalityMatch[0].includes('DEUTSCH') ? 'DEUTSCH' :
                                                nationalityMatch[1]?.trim();
        }
        
        // Authority
        const authorityMatch = ocrText.match(/AUTHORITY\s+([A-Z]+)/i);
        if (authorityMatch) extractedData.ausstellende_behoerde = authorityMatch[1].trim();

        // Aufenthaltstitel (Residence Permit) extraction
        // Look for type of residence permit
        const aufenthaltsArtMatch = ocrText.match(
          /(?:Aufenthaltserlaubnis|Niederlassungserlaubnis|Blaue Karte EU|EU Blue Card|Residence Permit|Settlement Permit)/i
        );
        if (aufenthaltsArtMatch) {
          extractedData.aufenthaltstitel_art = aufenthaltsArtMatch[0].trim();
        }

        // Look for residence permit number (often follows patterns like AT-123456 or similar)
        const aufenthaltsNummerMatch = ocrText.match(
          /(?:Aufenthaltstitel[- ]?Nr\.|AT[- ]?Nr\.|Permit No\.?)[:\s]*([A-Z0-9\-]+)/i
        );
        if (aufenthaltsNummerMatch) {
          extractedData.aufenthaltstitel_nummer = aufenthaltsNummerMatch[1].trim();
        }

        // Look for validity dates (Gültig ab / Valid from)
        const aufenthaltsVonMatch = ocrText.match(
          /(?:Gültig ab|Valid from|Ausgestellt am)[:\s]*(\d{2}[\/\.]\d{2}[\/\.]\d{4})/i
        );
        if (aufenthaltsVonMatch) {
          const dateStr = aufenthaltsVonMatch[1].replace(/\./g, '/');
          const [day, month, year] = dateStr.split('/');
          extractedData.aufenthaltstitel_gueltig_von = `${year}-${month}-${day}`;
        }

        // Look for validity end date (Gültig bis / Valid until)
        const aufenthaltsBisMatch = ocrText.match(
          /(?:Gültig bis|Valid until|Expires on)[:\s]*(\d{2}[\/\.]\d{2}[\/\.]\d{4})/i
        );
        if (aufenthaltsBisMatch) {
          const dateStr = aufenthaltsBisMatch[1].replace(/\./g, '/');
          const [day, month, year] = dateStr.split('/');
          extractedData.aufenthaltstitel_gueltig_bis = `${year}-${month}-${day}`;
        }

        // Look for purpose of residence
        const aufenthaltsZweckMatch = ocrText.match(
          /(?:Zweck|Purpose|Erlaubt|Permitted)[:\s]*\n?\s*(Erwerbstätigkeit|Studium|Ausbildung|Familiennachzug|Employment|Study|Training|Family Reunion|[A-Z][A-Za-zäöüÄÖÜß\s]+?)(?=\n|$)/i
        );
        if (aufenthaltsZweckMatch) {
          extractedData.aufenthaltstitel_zweck = aufenthaltsZweckMatch[1].trim();
        }
      }

      // Insert into database
      const { data: insertedData, error: insertError } = await supabase
        .from("eltern_dokumente")
        .insert(extractedData)
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: insertedData,
          message: "Dokument erfolgreich extrahiert",
          ocrText: ocrText,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else {
      throw new Error("OCR processing failed");
    }
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
