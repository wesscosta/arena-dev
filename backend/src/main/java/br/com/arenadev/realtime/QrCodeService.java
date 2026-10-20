package br.com.arenadev.realtime;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.net.URI;

@Service
public class QrCodeService {
    /** QR for {baseUrl}/join?code=..., where baseUrl is the origin the devices use. */
    public byte[] joinPng(String baseUrl, String code, int size) {
        return png(validateBaseUrl(baseUrl) + "/join?code=" + code, size);
    }

    public byte[] png(String content, int size) {
        try {
            int resolvedSize = Math.max(180, Math.min(size, 640));
            BitMatrix matrix = new QRCodeWriter().encode(
                    content,
                    BarcodeFormat.QR_CODE,
                    resolvedSize,
                    resolvedSize,
                    java.util.Map.of(EncodeHintType.MARGIN, 1)
            );
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", output);
            return output.toByteArray();
        } catch (Exception error) {
            throw new IllegalStateException("Não foi possível gerar o QR Code.", error);
        }
    }

    private static String validateBaseUrl(String raw) {
        try {
            URI uri = URI.create(raw == null ? "" : raw.trim());
            if (!("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    || uri.getHost() == null) {
                throw new IllegalArgumentException("Endereço público inválido para o QR Code.");
            }
            String base = uri.toString();
            return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("Endereço público inválido para o QR Code.");
        }
    }
}
