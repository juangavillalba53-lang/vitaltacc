package com.vitaltacc.dto;

import com.vitaltacc.model.MetodoPago;
import com.vitaltacc.model.TipoVenta;

import java.util.List;

public class VentaRequest {

    private Long clienteId;
    private Long empleadoId;
    private String dniCliente;
    private String nombreCliente;
    private String apellidoCliente;
    private MetodoPago metodoPago;
    private TipoVenta tipoVenta;
    private List<VentaItemRequest> detalles;

    public Long getClienteId() {
        return clienteId;
    }

    public void setClienteId(Long clienteId) {
        this.clienteId = clienteId;
    }

    public Long getEmpleadoId() {
        return empleadoId;
    }

    public void setEmpleadoId(Long empleadoId) {
        this.empleadoId = empleadoId;
    }

    public String getDniCliente() {
        return dniCliente;
    }

    public void setDniCliente(String dniCliente) {
        this.dniCliente = dniCliente;
    }

    public String getNombreCliente() {
        return nombreCliente;
    }

    public void setNombreCliente(String nombreCliente) {
        this.nombreCliente = nombreCliente;
    }

    public String getApellidoCliente() {
        return apellidoCliente;
    }

    public void setApellidoCliente(String apellidoCliente) {
        this.apellidoCliente = apellidoCliente;
    }

    public MetodoPago getMetodoPago() {
        return metodoPago;
    }

    public void setMetodoPago(MetodoPago metodoPago) {
        this.metodoPago = metodoPago;
    }

    public TipoVenta getTipoVenta() {
        return tipoVenta;
    }

    public void setTipoVenta(TipoVenta tipoVenta) {
        this.tipoVenta = tipoVenta;
    }

    public List<VentaItemRequest> getDetalles() {
        return detalles;
    }

    public void setDetalles(List<VentaItemRequest> detalles) {
        this.detalles = detalles;
    }
}